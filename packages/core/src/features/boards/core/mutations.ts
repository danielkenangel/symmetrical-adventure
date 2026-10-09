import type { QueryClient } from "@tanstack/query-core";

import type { Api, Column } from "@state-demo/api";
import { mutationOptions } from "../../../platform/core/mutations";
import type { Cards } from "../../cards/core";
import { columnOf, withCardMoved, withCardPlaced, withWipLimits } from "./boardUpdates";
import { boardKeys, type BoardData } from "./queries";

interface MutationDeps {
  api: Api;
  queryClient: QueryClient;
  cards: Cards;
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
function refetchAfterLastWrite(queryClient: QueryClient, boardId: string): void {
  // onSettled runs before the mutation leaves the pending state, so this one counts itself.
  if (queryClient.isMutating({ mutationKey: boardKeys.writes(boardId) }) === 1) {
    void queryClient.invalidateQueries({ queryKey: boardKeys.board(boardId) });
  }
}

export function moveCardOptions({ api, queryClient, boardId }: MutationDeps) {
  const key = boardKeys.board(boardId);
  return mutationOptions({
    mutationKey: boardKeys.move(boardId),
    mutationFn: (input: { cardId: string; column: Column }) => api.moveCard(input),
    onMutate: async ({ cardId, column }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const board = queryClient.getQueryData<BoardData>(key);
      const from = board && columnOf(board, cardId);
      const index = from && board.columns[from].indexOf(cardId);
      queryClient.setQueryData<BoardData>(key, (board) => board && withCardMoved(board, cardId, column));
      return { from, index };
    },
    onError: (_error, { cardId, column }, context) => {
      const { from, index } = context ?? {};
      if (from === undefined) return;
      queryClient.setQueryData<BoardData>(key, (board) =>
        board && columnOf(board, cardId) === column ? withCardMoved(board, cardId, from, index) : board,
      );
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
      const previous = queryClient.getQueryData<BoardData>(key)?.wipLimits[column];
      queryClient.setQueryData<BoardData>(key, (board) => board && withWipLimits(board, { ...board.wipLimits, [column]: limit }));
      return { previous };
    },
    onError: (_error, { column, limit }, context) => {
      if (context?.previous === undefined) return;
      const previous = context.previous;
      queryClient.setQueryData<BoardData>(key, (board) =>
        board && board.wipLimits[column] === limit ? withWipLimits(board, { ...board.wipLimits, [column]: previous }) : board,
      );
    },
    onSettled: () => refetchAfterLastWrite(queryClient, boardId),
  });
}

/**
 * Creates a card. Not optimistic in the cache: while it's pending, the Todo column shows the
 * mutation's own input (read by key, `usePendingCardsMutation`), and nothing needs rolling back.
 */
export function createCardOptions({ api, queryClient, cards, boardId }: MutationDeps) {
  const key = boardKeys.board(boardId);
  return mutationOptions({
    mutationKey: boardKeys.create(boardId),
    mutationFn: (title: string) => api.createCard({ boardId, title }),
    onSuccess: async (card) => {
      // A refetch that started before the server created the card would remove it again.
      await queryClient.cancelQueries({ queryKey: key });
      cards.upsert([card], Date.now());
      queryClient.setQueryData<BoardData>(key, (board) => board && withCardPlaced(board, card));
    },
    onSettled: () => refetchAfterLastWrite(queryClient, boardId),
  });
}
