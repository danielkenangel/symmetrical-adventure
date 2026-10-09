import { noop, type QueryClient } from "@tanstack/query-core";

import type { Api, Card } from "../../../../../shared/api";
import { persisted } from "../../../platform/core/queryClient";
import { cardKeys, createCardQueries, toCardData } from "./queries";

export interface CardsDeps {
  api: Api;
  queryClient: QueryClient;
}

/**
 * The one owner of card data. Other features hold card IDs and resolve them here, so every view of
 * a card reads one cache entry, however many boards (or threads, or members lists) refer to it.
 */
export function createCards(deps: CardsDeps) {
  const queries = createCardQueries(deps.api);
  // Entries written by `upsert` are built from defaults, not from the query factory.
  deps.queryClient.setQueryDefaults(cardKeys.all(), persisted);

  return {
    queries,
    /**
     * Fills card entries from a response that carried whole cards (a board, a created card, a live
     * change), as fresh as that response, so they don't load again.
     */
    upsert(cards: readonly Card[], updatedAt: number): void {
      for (const card of cards)
        deps.queryClient.setQueryData(
          cardKeys.card(card.id),
          toCardData(card),
          { updatedAt },
        );
    },
    /** Warms a card's comments, e.g. when the pointer passes over it. */
    prefetchComments(cardId: string): void {
      void deps.queryClient.query(queries.comments(cardId)).catch(noop);
    },
  };
}

export type Cards = ReturnType<typeof createCards>;
