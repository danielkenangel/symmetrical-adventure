import { queryOptions } from "@tanstack/react-query";

import type { Api } from "../../../shared/api";

export const DAY = 24 * 60 * 60_000;

export const keys = {
  boards: () => ["boards"] as const,
  board: (boardId: string) => ["board", boardId] as const,
  comments: (cardId: string) => ["card", cardId, "comments"] as const,
  controls: () => ["server", "controls"] as const,
  // mutation keys
  moveCard: (boardId: string) => ["card.move", boardId] as const,
  createCard: (boardId: string) => ["card.create", boardId] as const,
};

/** Saved to disk: the data a restored screen needs for its first paint. */
const persisted = { meta: { persist: true }, gcTime: 7 * DAY } as const;

/** Query factories. Every use of a query goes through these, so they agree on keys and persistence. */
export function createQueries(api: Api) {
  return {
    boards: () => queryOptions({ queryKey: keys.boards(), queryFn: () => api.listBoards(), ...persisted }),
    board: (boardId: string) => queryOptions({ queryKey: keys.board(boardId), queryFn: () => api.getBoard(boardId), ...persisted }),
    // Not persisted: behind a click, and cheap to load.
    comments: (cardId: string) => queryOptions({ queryKey: keys.comments(cardId), queryFn: () => api.getComments(cardId) }),
    controls: () => queryOptions({ queryKey: keys.controls(), queryFn: () => api.getControls(), staleTime: 0 }),
  };
}

export type Queries = ReturnType<typeof createQueries>;
