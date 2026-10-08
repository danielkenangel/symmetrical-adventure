import { useQuery } from "@tanstack/react-query";

import { createFeatureContext } from "../../platform/react/featureContext";
import type { Cards } from "./core";

const [CardsProvider, useCards] = createFeatureContext<Cards>("cards");
export { CardsProvider };

/** One card's cache entry. Re-renders only when the fields this component reads change. */
export function useCard(cardId: string) {
  return useQuery(useCards().queries.card(cardId));
}

/** Just the title: for components that filter or label by it. */
export function useCardTitle(cardId: string): string | undefined {
  return useQuery({ ...useCards().queries.card(cardId), select: (card) => card.title }).data;
}

export function useComments(cardId: string) {
  return useQuery(useCards().queries.comments(cardId));
}

export function useCardActions(): Cards {
  return useCards();
}
