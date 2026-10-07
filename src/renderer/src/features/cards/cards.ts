import type { QueryClient } from "@tanstack/react-query";

import { memo } from "../../platform/lifecycle";
import { createFeatureContext } from "../../platform/react";
import { CardModel } from "./CardModel";
import { createCardQueries, type CardsApi } from "./queries";

export interface CardsDeps {
  api: CardsApi;
  queryClient: QueryClient;
}

export interface Cards {
  /** One model per card that has been opened. */
  model(cardId: string): CardModel;
  /** Warms a card's comments, e.g. when the pointer passes over it. A stable function. */
  prefetch(cardId: string): void;
}

export function createCards(deps: CardsDeps): Cards {
  const queries = createCardQueries(deps.api);
  const models = new Map<string, CardModel>();
  return {
    model: (cardId) => memo(models, cardId, () => new CardModel({ queryClient: deps.queryClient, queries, cardId })),
    prefetch: (cardId) => void deps.queryClient.prefetchQuery(queries.comments(cardId)),
  };
}

export const [CardsProvider, useCards] = createFeatureContext<Cards>("cards");
