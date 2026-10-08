import type { Api, Card, Comment } from "../../../../../shared/api";
import { persisted } from "../../../platform/core/queryClient";

/** Private to the cards feature: other features resolve cards through its API, not its keys. */
export const cardKeys = {
  all: () => ["card"] as const,
  card: (cardId: string) => ["card", cardId] as const,
  comments: (cardId: string) => ["card-comments", cardId] as const,
};

/** A card's content. Where it sits (column, order) belongs to its board, so it isn't stored here. */
export type CardData = Omit<Card, "column" | "rank">;

export function toCardData({ id, boardId, title, assignee, commentCount }: Card): CardData {
  return { id, boardId, title, assignee, commentCount };
}

export function createCardQueries(api: Api) {
  return {
    // Usually already filled from the board's response (see `upsert`); fetched on its own when not.
    card: (cardId: string) => ({
      queryKey: cardKeys.card(cardId),
      queryFn: async (): Promise<CardData> => toCardData(await api.getCard(cardId)),
      ...persisted,
    }),
    // Not persisted: behind a click, and cheap to load.
    comments: (cardId: string) => ({ queryKey: cardKeys.comments(cardId), queryFn: (): Promise<Comment[]> => api.getComments(cardId) }),
  };
}

export type CardQueries = ReturnType<typeof createCardQueries>;
