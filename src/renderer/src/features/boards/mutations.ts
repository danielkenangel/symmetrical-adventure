import { mutationOptions, type QueryClient } from "@tanstack/react-query";

import type { Board, Column } from "../../../../shared/api";
import { withCard, withCardMoved, withWipLimits } from "./boardUpdates";
import { boardKeys, type BoardsApi } from "./queries";

interface MutationDeps {
  api: BoardsApi;
  queryClient: QueryClient;
  boardId: string;
}

/**
 * Optimistic writes to a cached board follow three rules:
 *
 * - Roll back with an inverse patch, never a snapshot of the whole board: a snapshot would also undo
 *   live changes and other writes that landed while this one was in flight.
 * - Only roll back if the value is still the one this write set; a later write may have replaced it.
 * - Refetch once the last write to the board settles, whatever its kind, so an early response can't
 *   overwrite a later optimistic change.
 */
function refetchAfterLastWrite(queryClient: QueryClient, boardId: string) {
  // onSettled runs before the mutation leaves the pending state, so this one counts itself.
  if (queryClient.isMutating({ mutationKey: boardKeys.writes(boardId) }) === 1) {
    return queryClient.invalidateQueries({ queryKey: boardKeys.board(boardId) });
  }
}

export function moveCardOptions({ api, queryClient, boardId }: MutationDeps) {
  const key = boardKeys.board(boardId);
  return mutationOptions({
    mutationKey: boardKeys.move(boardId),
    mutationFn: (input: { cardId: string; column: Column }) => api.moveCard(input),
    onMutate: async ({ cardId, column }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const card = queryClient.getQueryData<Board>(key)?.cards.find((candidate) => candidate.id === cardId);
      queryClient.setQueryData<Board>(key, (board) => board && withCardMoved(board, cardId, column));
      return { from: card?.column, rank: card?.rank };
    },
    onError: (_error, { cardId, column }, context) => {
      const { from, rank } = context ?? {};
      if (from === undefined) return;
      queryClient.setQueryData<Board>(key, (board) => {
        const card = board?.cards.find((candidate) => candidate.id === cardId);
        return board && card?.column === column ? withCardMoved(board, cardId, from, rank) : board;
      });
    },
    onSettled: () => refetchAfterLastWrite(queryClient, boardId),
  });
}

export function setWipLimitOptions({ api, queryClient, boardId }: MutationDeps) {
  const key = boardKeys.board(boardId);
  return mutationOptions({
    mutationKey: boardKeys.setWipLimit(boardId),
    mutationFn: (input: { column: Column; limit: number | null }) => api.setWipLimit({ boardId, ...input }),
    onMutate: async ({ column, limit }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Board>(key)?.wipLimits[column];
      queryClient.setQueryData<Board>(key, (board) => board && withWipLimits(board, { ...board.wipLimits, [column]: limit }));
      return { previous };
    },
    onError: (_error, { column, limit }, context) => {
      if (context?.previous === undefined) return;
      const previous = context.previous;
      queryClient.setQueryData<Board>(key, (board) =>
        board && board.wipLimits[column] === limit ? withWipLimits(board, { ...board.wipLimits, [column]: previous }) : board,
      );
    },
    onSettled: () => refetchAfterLastWrite(queryClient, boardId),
  });
}

/**
 * Creates a card. Not optimistic in the cache: while it's pending, the Todo column renders the
 * mutation's own input (BoardView passes it down as `pending`), and nothing needs rolling back.
 */
export function createCardOptions({ api, queryClient, boardId }: MutationDeps) {
  const key = boardKeys.board(boardId);
  return mutationOptions({
    mutationKey: boardKeys.create(boardId),
    mutationFn: (title: string) => api.createCard({ boardId, title }),
    onSuccess: async (card) => {
      // A refetch that started before the server created the card would remove it again.
      await queryClient.cancelQueries({ queryKey: key });
      queryClient.setQueryData<Board>(key, (board) => board && withCard(board, card));
    },
    onSettled: () => refetchAfterLastWrite(queryClient, boardId),
  });
}
