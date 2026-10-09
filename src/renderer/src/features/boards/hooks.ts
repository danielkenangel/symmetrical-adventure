import { useMutationState, useQuery } from "@tanstack/react-query";

import { COLUMNS, type Column } from "../../../../shared/api";
import { createFeatureContext } from "../../platform/react/featureContext";
import { selectFrom } from "../../platform/react/select";
import { useSelectedCardId } from "../navigation";
import { boardKeys, columnOf, type Boards } from "./core";

const [BoardsProvider, useBoards] = createFeatureContext<Boards>("boards");
export { BoardsProvider };

function useBoardsStore() {
  return useBoards().store;
}
const select = selectFrom(useBoardsStore);

export function useBoardList() {
  return useQuery(useBoards().queries.list());
}

/** Whether the board's first load is still running. */
export function useBoardPending(boardId: string): boolean {
  return useQuery(useBoards().queries.board(boardId)).isPending;
}

export function useBoardName(boardId: string): string | undefined {
  return useQuery({ ...useBoards().queries.board(boardId), select: (board) => board.name }).data;
}

/** For the sidebar badge: re-renders only when the count does. */
export function useTodoCount(boardId: string) {
  return useQuery({ ...useBoards().queries.board(boardId), select: (board) => board.columns.todo.length });
}

/**
 * One column: its card IDs and WIP limit. The selection is structurally shared, so a column whose
 * cards didn't change keeps the same array and doesn't re-render.
 */
export function useColumn(boardId: string, column: Column): { cardIds: readonly string[]; limit: number | null } {
  const { data } = useQuery({
    ...useBoards().queries.board(boardId),
    select: (board) => ({ cardIds: board.columns[column], limit: board.wipLimits[column] }),
  });
  return data ?? { cardIds: NO_IDS, limit: null };
}

/** Every card on the board, column by column. Structurally shared. */
export function useBoardCardIds(boardId: string): readonly string[] {
  const { data } = useQuery({
    ...useBoards().queries.board(boardId),
    select: (board) => COLUMNS.flatMap((column) => board.columns[column]),
  });
  return data ?? NO_IDS;
}

/** Which column a card is in on this board, or undefined if it isn't (or is no longer) here. */
export function useCardColumn(boardId: string, cardId: string): Column | undefined {
  return useQuery({ ...useBoards().queries.board(boardId), select: (board) => columnOf(board, cardId) }).data;
}

/** The open card, if it's on this board. Which card is open belongs to navigation. */
export function useOpenCardId(boardId: string): string | null {
  const cardId = useSelectedCardId();
  return useCardColumn(boardId, cardId ?? "") && cardId ? cardId : null;
}

export const useBoardFilter = select((s, boardId: string) => s.filters[boardId] ?? "");

/** Cards being created: the pending mutations' own input, read by key. Nothing is in the cache yet. */
export function usePendingCards(boardId: string): Array<{ id: number; title: string }> {
  return useMutationState({
    filters: { mutationKey: boardKeys.create(boardId), status: "pending" },
    select: (mutation) => ({ id: mutation.mutationId, title: mutation.state.variables as string }),
  });
}

/** The latest move's error, if it failed (and was undone). Cleared by the next move. */
export function useMoveError(boardId: string): string | null {
  const moves = useMutationState({
    filters: { mutationKey: boardKeys.move(boardId) },
    select: (mutation) => mutation.state.error?.message ?? null,
  });
  return moves.at(-1) ?? null;
}

export function useBoardActions(): Boards["actions"] {
  return useBoards().actions;
}

const NO_IDS: readonly string[] = [];
