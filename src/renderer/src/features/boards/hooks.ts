import { useMutation, useMutationState } from "@tanstack/react-query";

import { useBoards } from "./boards";
import { boardKeys } from "./queries";

export function useMoveCard(boardId: string) {
  return useMutation(useBoards().mutations.move(boardId));
}

export function useCreateCard(boardId: string) {
  return useMutation(useBoards().mutations.create(boardId));
}

export function useSetWipLimit(boardId: string) {
  return useMutation(useBoards().mutations.setWipLimit(boardId));
}

export interface PendingCard {
  title: string;
  id: number;
}

/** Cards being created, from the pending mutations' input rather than the cache. */
export function usePendingCards(boardId: string): PendingCard[] {
  return useMutationState({
    filters: { mutationKey: boardKeys.create(boardId), status: "pending" },
    select: (mutation): PendingCard => ({ title: mutation.state.variables as string, id: mutation.mutationId }),
  });
}
