import type { QueryClient } from "@tanstack/react-query";
import { action, comparer, computed, observable } from "mobx";
import { computedFn } from "mobx-utils";

import type { Board, Card, Column } from "../../../../shared/api";
import { COLUMNS } from "../../../../shared/api";
import { ObservableQuery } from "../../platform/data/ObservableQuery";
import type { BoardQueries } from "./queries";

const NO_CARDS: readonly Card[] = [];

export interface ColumnView {
  column: Column;
  /** Visible cards, in rank order, after the filter. */
  cardIds: string[];
  /** Every card in the column, ignoring the filter. */
  total: number;
  limit: number | null;
  overLimit: boolean;
}

export interface BoardModelDeps {
  queryClient: QueryClient;
  queries: BoardQueries;
  boardId: string;
}

/**
 * One board. Holds client state (the filter) and derives everything else from the cached board.
 * It never copies server data: optimistic writes and live changes land in the query cache, and
 * every computed here follows.
 */
export class BoardModel {
  @observable accessor filter = "";
  private readonly query: ObservableQuery<Board>;

  constructor(private readonly deps: BoardModelDeps) {
    this.query = new ObservableQuery(deps.queryClient, deps.queries.board(deps.boardId));
  }

  get id(): string {
    return this.deps.boardId;
  }

  @computed get isLoading(): boolean {
    return this.query.isPending;
  }

  @computed get name(): string {
    return this.query.data?.name ?? "";
  }

  @computed get cards(): readonly Card[] {
    return this.query.data?.cards ?? NO_CARDS;
  }

  @computed get cardById(): ReadonlyMap<string, Card> {
    return new Map(this.cards.map((card) => [card.id, card]));
  }

  /** The sidebar badge and the window title. */
  @computed get todoCount(): number {
    return this.cards.filter((card) => card.column === "todo").length;
  }

  card(cardId: string): Card | undefined {
    return this.cardById.get(cardId);
  }

  limit(column: Column): number | null {
    return this.query.data?.wipLimits[column] ?? null;
  }

  /** A column as displayed: filtered, ordered, and checked against its WIP limit (a setting). */
  readonly column = computedFn(
    (column: Column): ColumnView => {
      const all = this.cards.filter((card) => card.column === column);
      const needle = this.filter.trim().toLowerCase();
      const visible = needle ? all.filter((card) => card.title.toLowerCase().includes(needle)) : all;
      const limit = this.limit(column);
      return {
        column,
        cardIds: [...visible].sort((a, b) => a.rank - b.rank).map((card) => card.id),
        total: all.length,
        limit,
        overLimit: limit !== null && all.length > limit,
      };
    },
    { equals: comparer.structural },
  );

  get columns(): readonly Column[] {
    return COLUMNS;
  }

  @action setFilterAction(filter: string): void {
    this.filter = filter;
  }
}
