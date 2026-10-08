import type { QueryClient } from "@tanstack/query-core";

import type { BoardSummary } from "../../../../../shared/api";
import { Disposer } from "../../../platform/core/lifecycle";
import { boardKeys, type BoardData } from "../../boards/core";
import type { Navigation } from "../../navigation/core";

export interface ShellDeps {
  navigation: Navigation;
  queryClient: QueryClient;
  setTitle: (title: string) => void;
}

/**
 * The board on screen: the one the user picked, else the first. A saved location can name a board
 * that no longer exists, so once the list has loaded, an unknown choice falls back to the first
 * board. Until then the choice is trusted, so a restored board paints from its own cache.
 */
export function currentBoardId(chosen: string | null, boards: readonly BoardSummary[] | undefined): string | null {
  const valid = chosen !== null && (boards === undefined || boards.some((board) => board.id === chosen));
  return valid ? chosen : (boards?.[0]?.id ?? null);
}

export function createShell(deps: ShellDeps) {
  const { navigation, queryClient } = deps;
  return {
    /**
     * Keeps the window title on the current board and its Todo count. Outside React: it follows the
     * navigation store and the query cache, and shows whatever the cache holds.
     */
    start(): () => void {
      const disposer = new Disposer();
      let title = "";
      const update = () => {
        const boardId = currentBoardId(navigation.store.getState().boardId, queryClient.getQueryData(boardKeys.list()));
        const board = boardId ? queryClient.getQueryData<BoardData>(boardKeys.board(boardId)) : undefined;
        const next = board ? `${board.name} (${board.columns.todo.length} to do)` : "State demo";
        if (next !== title) deps.setTitle((title = next));
      };
      disposer.add(navigation.store.subscribe(update));
      disposer.add(queryClient.getQueryCache().subscribe(({ query }) => query.queryKey[0] !== "card" && update()));
      update();
      return () => disposer.dispose();
    },
  };
}

export type Shell = ReturnType<typeof createShell>;
