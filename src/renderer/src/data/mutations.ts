import { useMutation } from "@tanstack/react-query";

import type { Board, Column, ServerControls, WipLimits } from "../../../shared/api";
import { useApp } from "../app/AppContext";
import { withCard, withCardMoved, withWipLimits } from "./boardUpdates";
import { keys } from "./queries";

/**
 * Moves a card, optimistically: the cached board changes before the request is sent, so every
 * model and count reading it updates at once. A failure puts the previous board back.
 */
export function useMoveCard(boardId: string) {
  const { api, queryClient } = useApp();
  return useMutation({
    mutationKey: keys.moveCard(boardId),
    mutationFn: (input: { cardId: string; column: Column }) => api.moveCard(input),
    onMutate: async ({ cardId, column }) => {
      await queryClient.cancelQueries({ queryKey: keys.board(boardId) });
      const previous = queryClient.getQueryData<Board>(keys.board(boardId));
      queryClient.setQueryData<Board>(keys.board(boardId), (board) => board && withCardMoved(board, cardId, column));
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(keys.board(boardId), context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: keys.board(boardId) }),
  });
}

/**
 * Creates a card. Not optimistic in the cache: while it's pending, the Todo column renders the
 * mutation's own input (see ColumnView), and nothing needs rolling back if it fails.
 */
export function useCreateCard(boardId: string) {
  const { api, queryClient } = useApp();
  return useMutation({
    mutationKey: keys.createCard(boardId),
    mutationFn: (title: string) => api.createCard({ boardId, title }),
    onSuccess: (card) => queryClient.setQueryData<Board>(keys.board(boardId), (board) => board && withCard(board, card)),
  });
}

export function useSetWipLimit(boardId: string) {
  const { api, queryClient } = useApp();
  return useMutation({
    mutationFn: (input: { column: Column; limit: number | null }) => api.setWipLimit({ boardId, ...input }),
    onMutate: async ({ column, limit }) => {
      await queryClient.cancelQueries({ queryKey: keys.board(boardId) });
      const previous = queryClient.getQueryData<Board>(keys.board(boardId));
      queryClient.setQueryData<Board>(keys.board(boardId), (board) => board && withWipLimits(board, { ...board.wipLimits, [column]: limit }));
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(keys.board(boardId), context.previous);
    },
    onSuccess: (wipLimits: WipLimits) => queryClient.setQueryData<Board>(keys.board(boardId), (board) => board && withWipLimits(board, wipLimits)),
  });
}

export function useSetControls() {
  const { api, queryClient } = useApp();
  return useMutation({
    mutationFn: (patch: Partial<ServerControls>) => api.setControls(patch),
    onMutate: (patch) => {
      queryClient.setQueryData<ServerControls>(keys.controls(), (controls) => controls && { ...controls, ...patch });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: keys.controls() }),
  });
}
