import type { QueryClient } from "@tanstack/query-core";

import { Disposer } from "../../../platform/core/lifecycle";
import { boardKeys, currentBoardId, type BoardData } from "../../boards/core";
import type { Navigation } from "../../navigation/core";

export interface TitleDeps {
  navigation: Navigation;
  queryClient: QueryClient;
  setTitle: (title: string) => void;
}

/** The title an app shows for where the user is: the window title on desktop, the tab's on the web. */
export function createTitle(deps: TitleDeps) {
  const { navigation, queryClient } = deps;
  return {
    /**
     * Keeps the title on the current board and its Todo count. Outside React: it follows the
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
      disposer.add(navigation.store.watch((s) => s.boardId, update));
      disposer.add(queryClient.getQueryCache().subscribe(({ query }) => query.queryKey[0] !== "card" && update()));
      update();
      return () => disposer.dispose();
    },
  };
}

export type Title = ReturnType<typeof createTitle>;
