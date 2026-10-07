import type { Board, Card, Column, WipLimits } from "../../../../shared/api";

/** Pure updates to a cached board, shared by optimistic writes and live changes. */

export function nextRank(cards: readonly Card[], column: Column): number {
  return Math.max(-1, ...cards.filter((card) => card.column === column).map((card) => card.rank)) + 1;
}

/** Moves a card to the end of `column`, or to `rank` when putting it back where it was. */
export function withCardMoved(board: Board, cardId: string, column: Column, rank = nextRank(board.cards, column)): Board {
  const card = board.cards.find((candidate) => candidate.id === cardId);
  if (!card || card.column === column) return board;
  return { ...board, cards: board.cards.map((candidate) => (candidate.id === cardId ? { ...candidate, column, rank } : candidate)) };
}

/** Inserts or replaces a card, as reported by the server. */
export function withCard(board: Board, card: Card): Board {
  if (card.boardId !== board.id) return board;
  const exists = board.cards.some((candidate) => candidate.id === card.id);
  return { ...board, cards: exists ? board.cards.map((candidate) => (candidate.id === card.id ? card : candidate)) : [...board.cards, card] };
}

export function withWipLimits(board: Board, wipLimits: WipLimits): Board {
  return { ...board, wipLimits };
}
