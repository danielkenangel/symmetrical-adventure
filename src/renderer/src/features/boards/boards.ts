import type { QueryClient } from "@tanstack/react-query";

import type { Board, BoardSummary } from "../../../../shared/api";
import { ObservableQuery } from "../../platform/data/ObservableQuery";
import { memo } from "../../platform/lifecycle";
import { createFeatureContext } from "../../platform/react";
import { BoardModel } from "./BoardModel";
import { withCard } from "./boardUpdates";
import { createCardOptions, moveCardOptions, setWipLimitOptions } from "./mutations";
import { boardKeys, createBoardQueries, type BoardsApi } from "./queries";

export interface BoardsDeps {
  api: BoardsApi;
  queryClient: QueryClient;
}

export interface Boards {
  readonly list: ObservableQuery<BoardSummary[]>;
  /** One model per board, kept once built, so each board keeps its own filter. */
  model(boardId: string): BoardModel;
  readonly mutations: {
    move: (boardId: string) => ReturnType<typeof moveCardOptions>;
    create: (boardId: string) => ReturnType<typeof createCardOptions>;
    setWipLimit: (boardId: string) => ReturnType<typeof setWipLimitOptions>;
  };
  /** Patches other people's edits into the cached boards. */
  start(): () => void;
}

export function createBoards(deps: BoardsDeps): Boards {
  const queries = createBoardQueries(deps.api);
  // A family keyed only by an ID has no reactive inputs, so it's a plain memo, not a computedFn.
  const models = new Map<string, BoardModel>();
  return {
    list: new ObservableQuery(deps.queryClient, queries.list()),
    model: (boardId) => memo(models, boardId, () => new BoardModel({ queryClient: deps.queryClient, queries, boardId })),
    mutations: {
      move: (boardId) => moveCardOptions({ ...deps, boardId }),
      create: (boardId) => createCardOptions({ ...deps, boardId }),
      setWipLimit: (boardId) => setWipLimitOptions({ ...deps, boardId }),
    },
    // Only the changed card gets a new object, so only what shows it re-renders.
    start: () =>
      deps.api.onCardChanged(({ boardId, card }) => {
        deps.queryClient.setQueryData<Board>(boardKeys.board(boardId), (board) => board && withCard(board, card));
      }),
  };
}

export const [BoardsProvider, useBoards] = createFeatureContext<Boards>("boards");
