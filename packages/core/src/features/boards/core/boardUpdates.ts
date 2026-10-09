import type { Card, Column, WipLimits } from "@state-demo/api";
import { COLUMNS } from "@state-demo/api";
import type { BoardData } from "./queries";

/** Pure updates to a cached board, shared by optimistic writes and live changes. */

export function columnOf(board: BoardData, cardId: string): Column | undefined {
  return COLUMNS.find((column) => board.columns[column].includes(cardId));
}

/** Moves a card to the end of `column`, or to `index` when putting it back where it was. */
export function withCardMoved(board: BoardData, cardId: string, column: Column, index?: number): BoardData {
  const from = columnOf(board, cardId);
  if (!from || from === column) return board;
  const target = [...board.columns[column]];
  target.splice(index ?? target.length, 0, cardId);
  return { ...board, columns: { ...board.columns, [from]: board.columns[from].filter((id) => id !== cardId), [column]: target } };
}

/** Places a card where the server says it is: new cards go to the end of their column. */
export function withCardPlaced(board: BoardData, card: Card): BoardData {
  if (card.boardId !== board.id) return board;
  if (columnOf(board, card.id)) return withCardMoved(board, card.id, card.column);
  return { ...board, columns: { ...board.columns, [card.column]: [...board.columns[card.column], card.id] } };
}

export function withWipLimits(board: BoardData, wipLimits: WipLimits): BoardData {
  return { ...board, wipLimits };
}
