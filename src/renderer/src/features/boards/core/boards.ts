import type { QueryClient } from "@tanstack/query-core";
import type { Api, Column } from "../../../../../shared/api";
import { defineStore } from "../../../platform/core/defineStore";
import { runMutation } from "../../../platform/core/mutations";
import type { Cards } from "../../cards/core";
import { withCardPlaced } from "./boardUpdates";
import {
  createCardOptions,
  moveCardOptions,
  setWipLimitOptions,
} from "./mutations";
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
export function createBoards(deps: BoardsDeps) {
  const queries = createBoardQueries(deps.api, deps.cards);
  const store = defineStore({
    name: "boards",
    initialState: { filters: {} } as BoardsState,
    actions: (set) => ({
      setFilter: (boardId: string, filter: string) =>
        set("setFilter", (s) => ({
          filters: { ...s.filters, [boardId]: filter },
        })),
    }),
  });
  const mutationDeps = (boardId: string) => ({ ...deps, boardId });

  const actions = {
    ...store.actions,
    moveCard(boardId: string, cardId: string, column: Column): Promise<void> {
      return runMutation(
        deps.queryClient,
        moveCardOptions(mutationDeps(boardId)),
        { cardId, column },
      );
    },
    createCard(boardId: string, title: string): Promise<void> {
      return runMutation(
        deps.queryClient,
        createCardOptions(mutationDeps(boardId)),
        title,
      );
    },
    setWipLimit(
      boardId: string,
      column: Column,
      limit: number | null,
    ): Promise<void> {
      return runMutation(
        deps.queryClient,
        setWipLimitOptions(mutationDeps(boardId)),
        { column, limit },
      );
    },
  };

  return {
    queries,
    store,
    /** Every write: the store's actions and the mutations, called the same way in and out of React. */
    actions,
    /** Applies other people's changes to the cached boards. */
    start(): () => void {
      // A change carries the whole card: its content goes to the cards feature, its place to the board.
      return deps.api.onCardChanged(({ boardId, card }) => {
        deps.cards.upsert([card], Date.now());
        deps.queryClient.setQueryData<BoardData>(
          boardKeys.board(boardId),
          (board) => board && withCardPlaced(board, card),
        );
      });
    },
  };
}

export type Boards = ReturnType<typeof createBoards>;
