/**
 * The contract between the app and the (fake) server. Every app gets one: desktop over IPC to the
 * main process, web and mobile in-process (@state-demo/fake-server).
 */

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

/** A board as the server sends it: denormalized, with every card embedded. */
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
  /** Board chat events per second, per board being watched. */
  chatRate: number;
}

/** Someone else changed a card. */
export interface CardChanged {
  boardId: string;
  card: Card;
}

/** A line in a board's chat: the Twitch chat of kanban boards. */
export interface ChatMessage {
  id: string;
  boardId: string;
  author: string;
  text: string;
  /** Hype reactions so far. Changes after the message arrives, so a line can update in place. */
  hype: number;
}

/** One event on a board's chat stream. They arrive one at a time, hundreds a second. */
export type ChatEvent = { type: "message"; message: ChatMessage } | { type: "hype"; messageId: string };

export interface Api {
  listBoards(): Promise<BoardSummary[]>;
  getBoard(boardId: string): Promise<Board>;
  getCard(cardId: string): Promise<Card>;
  getComments(cardId: string): Promise<Comment[]>;
  moveCard(input: { cardId: string; column: Column }): Promise<Card>;
  createCard(input: { boardId: string; title: string }): Promise<Card>;
  setWipLimit(input: { boardId: string; column: Column; limit: number | null }): Promise<WipLimits>;
  getControls(): Promise<ServerControls>;
  setControls(patch: Partial<ServerControls>): Promise<ServerControls>;
  onCardChanged(listener: (change: CardChanged) => void): () => void;
  /** Starts streaming a board's chat. Events arrive one per message, like a WebSocket. */
  watchChat(boardId: string, listener: (event: ChatEvent) => void): () => void;
}
