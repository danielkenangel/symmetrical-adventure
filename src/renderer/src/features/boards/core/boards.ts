import type { QueryClient } from "@tanstack/query-core";
import { createStore } from "zustand/vanilla";

import type { Api, Column } from "../../../../../shared/api";
import { runMutation } from "../../../platform/core/mutations";
import type { Cards } from "../../cards/core";
import { withCardPlaced } from "./boardUpdates";
import { createCardOptions, moveCardOptions, setWipLimitOptions } from "./mutations";
import { boardKeys, createBoardQueries, type BoardData } from "./queries";

export interface BoardsDeps {
  api: Api;
  queryClient: QueryClient;
  cards: Cards;
}

/** Client state about boards. Server data stays in the query cache. */
export interface BoardsState {
  /** Each board's card filter, kept while the app runs. A deleted board's entry is never read. */
  filters: Record<string, string>;
}

/**
 * The boards feature's core: board queries, client state, and every write. Writes are plain
 * functions, so a click handler and code outside React call the same thing, and each one runs its
 * mutation and its client-side effects together.
 */
export function createBoards(deps: BoardsDeps) {
  const queries = createBoardQueries(deps.api, deps.cards);
  const store = createStore<BoardsState>()(() => ({ filters: {} }));
  const mutationDeps = (boardId: string) => ({ ...deps, boardId });

  return {
    queries,
    store,
    setFilter(boardId: string, filter: string): void {
      store.setState((s) => ({ filters: { ...s.filters, [boardId]: filter } }));
    },
    moveCard(boardId: string, cardId: string, column: Column): Promise<void> {
      return runMutation(deps.queryClient, moveCardOptions(mutationDeps(boardId)), { cardId, column });
    },
    createCard(boardId: string, title: string): Promise<void> {
      return runMutation(deps.queryClient, createCardOptions(mutationDeps(boardId)), title);
    },
    setWipLimit(boardId: string, column: Column, limit: number | null): Promise<void> {
      return runMutation(deps.queryClient, setWipLimitOptions(mutationDeps(boardId)), { column, limit });
    },
    /** Applies other people's changes to the cached boards. */
    start(): () => void {
      // A change carries the whole card: its content goes to the cards feature, its place to the board.
      return deps.api.onCardChanged(({ boardId, card }) => {
        deps.cards.upsert([card], Date.now());
        deps.queryClient.setQueryData<BoardData>(boardKeys.board(boardId), (board) => board && withCardPlaced(board, card));
      });
    },
  };
}

export type Boards = ReturnType<typeof createBoards>;
