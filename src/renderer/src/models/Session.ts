import type { QueryClient } from "@tanstack/react-query";
import { computed, untracked } from "mobx";

import type { BoardSummary } from "../../../shared/api";
import { ObservableQuery } from "../data/ObservableQuery";
import type { Queries } from "../data/queries";
import type { AppLocation } from "./AppLocation";
import { BoardModel } from "./BoardModel";
import { CardModel } from "./CardModel";
import { ServerModel } from "./ServerModel";

export interface SessionDeps {
  queryClient: QueryClient;
  queries: Queries;
  location: AppLocation;
}

/**
 * Builds models from the identities they depend on. There's no list of app stages: a model
 * exists once something reads it, and is keyed by what it was built from.
 */
export class Session {
  readonly boards: ObservableQuery<BoardSummary[]>;
  readonly server: ServerModel;

  constructor(private readonly deps: SessionDeps) {
    this.boards = new ObservableQuery(deps.queryClient, deps.queries.boards());
    this.server = new ServerModel({ queryClient: deps.queryClient, queries: deps.queries });
  }

  /**
   * One model per board, kept once built, so each board keeps its own filter. A family keyed
   * only by an ID has no reactive inputs, so it's a plain memo, not a `computedFn` (which would be
   * a derivation that reads nothing, and `reactionRequiresObservable` rightly flags that).
   */
  board(boardId: string): BoardModel {
    return memo(this.boardModels, boardId, () => new BoardModel({ queryClient: this.deps.queryClient, queries: this.deps.queries, boardId }));
  }

  /** One model per card that has been opened. */
  card(cardId: string): CardModel {
    return memo(this.cardModels, cardId, () => new CardModel({ queryClient: this.deps.queryClient, queries: this.deps.queries, cardId }));
  }

  private readonly boardModels = new Map<string, BoardModel>();
  private readonly cardModels = new Map<string, CardModel>();

  /** The board on screen: the one the user picked, else the first. */
  @computed get currentBoard(): BoardModel | null {
    const boardId = this.deps.location.boardId ?? this.boards.data?.[0]?.id;
    return boardId ? this.board(boardId) : null;
  }
}

/** Builds a model once per key. Construction is pure and untracked, so it can happen mid-render. */
function memo<K, V>(cache: Map<K, V>, key: K, build: () => V): V {
  let value = cache.get(key);
  if (value === undefined) {
    value = untracked(build);
    cache.set(key, value);
  }
  return value;
}
