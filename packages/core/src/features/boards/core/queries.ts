import type { Api, Board, BoardSummary, Column, WipLimits } from "@state-demo/api";
import { COLUMNS } from "@state-demo/api";
import { defineQuery } from "../../../platform/core/defineQuery";
import { persisted } from "../../../platform/core/queryClient";
import type { Cards } from "../../cards/core";

export const boardKeys = {
  list: () => ["boards"] as const,
  board: (boardId: string) => ["board", boardId] as const,
  // Mutation keys. Every write to a board shares the prefix, so "is any write to this board still
  // in flight?" is one isMutating({ mutationKey: writes(boardId) }) call.
  writes: (boardId: string) => ["board-write", boardId] as const,
  move: (boardId: string) => ["board-write", boardId, "move"] as const,
  create: (boardId: string) => ["board-write", boardId, "create"] as const,
  setWipLimit: (boardId: string) => ["board-write", boardId, "wip-limit"] as const,
};

/** A board as cached: where each card sits, by ID. The cards themselves belong to the cards feature. */
export interface BoardData {
  id: string;
  name: string;
  wipLimits: WipLimits;
  /** Card IDs per column, in order. */
  columns: Record<Column, string[]>;
}

/** Splits the server's board: card content goes to the cards feature, placement stays here. */
function normalize(board: Board, cards: Cards): BoardData {
  cards.upsert(board.cards, Date.now());
  const sorted = [...board.cards].sort((a, b) => a.rank - b.rank);
  const columns = Object.fromEntries(
    COLUMNS.map((column) => [column, sorted.filter((card) => card.column === column).map((card) => card.id)]),
  ) as Record<Column, string[]>;
  return {
    id: board.id,
    name: board.name,
    wipLimits: board.wipLimits,
    columns,
  };
}

/** Query factories. Every use of a board query goes through these, so they agree on keys and persistence. */
export function createBoardQueries(api: Api, cards: Cards) {
  return {
    list: () =>
      defineQuery({
        queryKey: boardKeys.list(),
        queryFn: (): Promise<BoardSummary[]> => api.listBoards(),
        ...persisted,
      }),
    board: (boardId: string) =>
      defineQuery({
        queryKey: boardKeys.board(boardId),
        queryFn: async (): Promise<BoardData> => normalize(await api.getBoard(boardId), cards),
        ...persisted,
      }),
  };
}

export type BoardQueries = ReturnType<typeof createBoardQueries>;
