import { queryOptions } from "@tanstack/react-query";

import type { Api } from "../../../../shared/api";

export const cardKeys = {
  comments: (cardId: string) => ["card", cardId, "comments"] as const,
};

export type CardsApi = Pick<Api, "getComments">;

export function createCardQueries(api: CardsApi) {
  return {
    // Not persisted: behind a click, and cheap to load.
    comments: (cardId: string) => queryOptions({ queryKey: cardKeys.comments(cardId), queryFn: () => api.getComments(cardId) }),
  };
}

export type CardQueries = ReturnType<typeof createCardQueries>;
