import type { QueryClient } from "@tanstack/react-query";

import type { Api, Board } from "../../../shared/api";
import { withCard } from "../data/boardUpdates";
import { keys } from "../data/queries";

/**
 * Other people's edits, patched into the cached board. Only the changed card gets a new object,
 * so only what shows it re-renders. Returns the unsubscribe.
 */
export function startLiveUpdates(deps: { api: Api; queryClient: QueryClient }): () => void {
  return deps.api.onCardChanged(({ boardId, card }) => {
    deps.queryClient.setQueryData<Board>(keys.board(boardId), (board) => board && withCard(board, card));
  });
}
