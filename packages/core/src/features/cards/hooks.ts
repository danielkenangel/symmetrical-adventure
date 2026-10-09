import { useQueries, useQuery } from "@tanstack/react-query";

import { createFeatureContext } from "../../platform/react/featureContext";
import type { CardData, Cards } from "./core";

const [CardsProvider, useCards] = createFeatureContext<Cards>("cards");
export { CardsProvider };

/** One card's cache entry. Re-renders only when the fields this component reads change. */
export function useCardQuery(cardId: string) {
  return useQuery(useCards().queries.card(cardId));
}

/** Just the title: for components that filter or label by it. */
export function useCardTitleQuery(cardId: string) {
  return useQuery({ ...useCards().queries.card(cardId), select: (card) => card.title });
}

/**
 * The IDs among `cardIds` whose card passes `test`, in order; a card still loading doesn't pass.
 * Structurally shared: the same `data` while the answer doesn't change, whichever cards changed.
 */
export function useCardIdsWhereQuery(cardIds: readonly string[], test: (card: CardData) => boolean) {
  const { queries } = useCards();
  return useQueries({
    queries: cardIds.map((cardId) => queries.card(cardId)),
    combine: (results) => ({
      data: cardIds.filter((_, index) => {
        const card = results[index]?.data;
        return card !== undefined && test(card);
      }),
      isPending: results.some((result) => result.isPending),
    }),
  });
}

export function useCommentsQuery(cardId: string) {
  return useQuery(useCards().queries.comments(cardId));
}

export function useCardActions(): Cards {
  return useCards();
}
