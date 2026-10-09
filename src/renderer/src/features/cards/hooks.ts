import { useQueries, useQuery } from "@tanstack/react-query";

import { createFeatureContext } from "../../platform/react/featureContext";
import type { CardData, Cards } from "./core";

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

/**
 * The IDs among `cardIds` whose card passes `test`, in order. Structurally shared: the same array
 * while the answer doesn't change, whichever cards changed.
 */
export function useCardIdsWhere(cardIds: readonly string[], test: (card: CardData) => boolean): readonly string[] {
  const { queries } = useCards();
  return useQueries({
    queries: cardIds.map((cardId) => queries.card(cardId)),
    combine: (results) =>
      cardIds.filter((_, index) => {
        const card = results[index]?.data;
        return card !== undefined && test(card);
      }),
  });
}

export function useComments(cardId: string) {
  return useQuery(useCards().queries.comments(cardId));
}

export function useCardActions(): Cards {
  return useCards();
}
