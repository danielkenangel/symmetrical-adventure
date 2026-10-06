import type { QueryClient } from "@tanstack/react-query";
import { computed } from "mobx";

import type { Comment } from "../../../shared/api";
import { ObservableQuery } from "../data/ObservableQuery";
import type { Queries } from "../data/queries";

const NO_COMMENTS: readonly Comment[] = [];

export interface CardModelDeps {
  queryClient: QueryClient;
  queries: Queries;
  cardId: string;
}

/** A card's detail data. The card itself comes from its board; only the comments load here. */
export class CardModel {
  private readonly query: ObservableQuery<Comment[]>;

  constructor(deps: CardModelDeps) {
    this.query = new ObservableQuery(deps.queryClient, deps.queries.comments(deps.cardId));
  }

  @computed get isLoading(): boolean {
    return this.query.isPending;
  }

  @computed get comments(): readonly Comment[] {
    return this.query.data ?? NO_COMMENTS;
  }
}
