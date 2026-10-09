import { useMutationState, useQuery } from "@tanstack/react-query";

import { COLUMNS, type Column } from "../../../../shared/api";
import { createFeatureContext } from "../../platform/react/featureContext";
import { createScopedContext } from "../../platform/react/scopedContext";
import { selectFrom } from "../../platform/react/select";
import { useSelectedCardId } from "../navigation";
import { boardKeys, columnOf, type ApplauseState, type Boards } from "./core";

const [BoardsProvider, useBoards] = createFeatureContext<Boards>("boards");
export { BoardsProvider };

function useBoardsStore() {
  return useBoards().store;
}
const select = selectFrom(useBoardsStore);

export function useBoardListQuery() {
  return useQuery(useBoards().queries.list());
}

/** The whole board. Results are tracked, so reading only `isPending` re-renders only when it changes. */
export function useBoardQuery(boardId: string) {
  return useQuery(useBoards().queries.board(boardId));
}

export function useBoardNameQuery(boardId: string) {
  return useQuery({ ...useBoards().queries.board(boardId), select: (board) => board.name });
}

/** For the sidebar badge: re-renders only when the count does. */
export function useTodoCountQuery(boardId: string) {
  return useQuery({ ...useBoards().queries.board(boardId), select: (board) => board.columns.todo.length });
}

/**
 * One column: its card IDs and WIP limit. The selection is structurally shared, so a column whose
 * cards didn't change keeps the same array and doesn't re-render.
 */
export function useColumnQuery(boardId: string, column: Column) {
  return useQuery({
    ...useBoards().queries.board(boardId),
    select: (board) => ({ cardIds: board.columns[column], limit: board.wipLimits[column] }),
  });
}

/** Every card on the board, column by column. Structurally shared. */
export function useBoardCardIdsQuery(boardId: string) {
  return useQuery({
    ...useBoards().queries.board(boardId),
    select: (board) => COLUMNS.flatMap((column) => board.columns[column]),
  });
}

/** Which column a card is in on this board, or undefined if it isn't (or is no longer) here. */
export function useCardColumnQuery(boardId: string, cardId: string) {
  return useQuery({ ...useBoards().queries.board(boardId), select: (board) => columnOf(board, cardId) });
}

/** The open card, if it's on this board (null if not). Which card is open belongs to navigation. */
export function useOpenCardIdQuery(boardId: string) {
  const cardId = useSelectedCardId();
  return useQuery({ ...useBoards().queries.board(boardId), select: (board) => (cardId && columnOf(board, cardId) ? cardId : null) });
}

export const useBoardFilter = select((s, boardId: string) => s.filters[boardId] ?? "");

/** Cards being created: the pending mutations' own input, read by key. Nothing is in the cache yet. */
export function usePendingCardsMutation(boardId: string): Array<{ id: number; title: string }> {
  return useMutationState({
    filters: { mutationKey: boardKeys.create(boardId), status: "pending" },
    select: (mutation) => ({ id: mutation.mutationId, title: mutation.state.variables as string }),
  });
}

/** The latest move's error, if it failed (and was undone). Cleared by the next move. */
export function useMoveErrorMutation(boardId: string): string | null {
  const moves = useMutationState({
    filters: { mutationKey: boardKeys.move(boardId) },
    select: (mutation) => mutation.state.error?.message ?? null,
  });
  return moves.at(-1) ?? null;
}

/** A store per mounted board, seeded from and saved to `boards.applause`. Render it keyed by board. */
const [ApplauseProvider, useApplauseStore] = createScopedContext({
  name: "applause",
  initialState: { count: 0 } as ApplauseState,
  actions: (set) => ({ clap: () => set("clap", (s) => ({ count: s.count + 1 })) }),
});
export { ApplauseProvider };

export function useApplauseSnapshots(): Boards["applause"] {
  return useBoards().applause;
}
export const useApplause = selectFrom(useApplauseStore)((s) => s.count);
export function useApplauseActions() {
  return useApplauseStore().actions;
}

export function useBoardActions(): Boards["actions"] {
  return useBoards().actions;
}
