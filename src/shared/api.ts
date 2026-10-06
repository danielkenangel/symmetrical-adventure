/** The contract between the renderer and the fake server in the main process. */

export type Column = "todo" | "doing" | "done";
export const COLUMNS: readonly Column[] = ["todo", "doing", "done"];
export const COLUMN_TITLES: Record<Column, string> = { todo: "Todo", doing: "In progress", done: "Done" };

export interface Card {
  id: string;
  boardId: string;
  title: string;
  column: Column;
  /** Order within its column; higher is later. */
  rank: number;
  assignee: string | null;
  commentCount: number;
}

export interface BoardSummary {
  id: string;
  name: string;
}

export type WipLimits = Record<Column, number | null>;

export interface Board {
  id: string;
  name: string;
  cards: Card[];
  wipLimits: WipLimits;
}

export interface Comment {
  id: string;
  cardId: string;
  author: string;
  body: string;
}

/** Knobs on the fake server, so the demo can show latency, failures and other people's edits. */
export interface ServerControls {
  latencyMs: number;
  failNext: boolean;
  remoteActivity: boolean;
}

/** Someone else changed a card. */
export interface CardChanged {
  boardId: string;
  card: Card;
}

export interface Api {
  listBoards(): Promise<BoardSummary[]>;
  getBoard(boardId: string): Promise<Board>;
  getComments(cardId: string): Promise<Comment[]>;
  moveCard(input: { cardId: string; column: Column }): Promise<Card>;
  createCard(input: { boardId: string; title: string }): Promise<Card>;
  setWipLimit(input: { boardId: string; column: Column; limit: number | null }): Promise<WipLimits>;
  getControls(): Promise<ServerControls>;
  setControls(patch: Partial<ServerControls>): Promise<ServerControls>;
  onCardChanged(listener: (change: CardChanged) => void): () => void;
}
