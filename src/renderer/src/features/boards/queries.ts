import { queryOptions } from "@tanstack/react-query";

import type { Api } from "../../../../shared/api";
import { persisted } from "../../platform/data/queryClient";

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

export type BoardsApi = Pick<Api, "listBoards" | "getBoard" | "moveCard" | "createCard" | "setWipLimit" | "onCardChanged">;

/** Query factories. Every use of a board query goes through these, so they agree on keys and persistence. */
export function createBoardQueries(api: BoardsApi) {
  return {
    list: () => queryOptions({ queryKey: boardKeys.list(), queryFn: () => api.listBoards(), ...persisted }),
    board: (boardId: string) => queryOptions({ queryKey: boardKeys.board(boardId), queryFn: () => api.getBoard(boardId), ...persisted }),
  };
}

export type BoardQueries = ReturnType<typeof createBoardQueries>;
