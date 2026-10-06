import type { Api, Board, BoardSummary, CardChanged, Comment, ServerControls } from "../../../shared/api";

/** An in-memory Api for tests: instant responses, a call log, and a way to push live changes. */
export function createFakeApi(boards: Board[]) {
  const store = new Map(boards.map((board) => [board.id, structuredClone(board)]));
  const listeners = new Set<(change: CardChanged) => void>();
  const calls: string[] = [];
  let controls: ServerControls = { latencyMs: 0, failNext: false, remoteActivity: false };

  const board = (boardId: string) => {
    const found = store.get(boardId);
    if (!found) throw new Error(`No board ${boardId}`);
    return found;
  };

  const api: Api = {
    listBoards: async () => {
      calls.push("listBoards");
      return [...store.values()].map(({ id, name }): BoardSummary => ({ id, name }));
    },
    // A fresh copy every time, like a real response: equal data, new objects.
    getBoard: async (boardId) => {
      calls.push(`getBoard ${boardId}`);
      return structuredClone(board(boardId));
    },
    getComments: async (cardId): Promise<Comment[]> => {
      calls.push(`getComments ${cardId}`);
      return [{ id: `${cardId}-c1`, cardId, author: "Ada", body: "Looks good." }];
    },
    moveCard: async ({ cardId, column }) => {
      const card = [...store.values()].flatMap((b) => b.cards).find((candidate) => candidate.id === cardId)!;
      card.column = column;
      return structuredClone(card);
    },
    createCard: async () => {
      throw new Error("not used");
    },
    setWipLimit: async ({ boardId, column, limit }) => {
      const target = board(boardId);
      target.wipLimits = { ...target.wipLimits, [column]: limit };
      return target.wipLimits;
    },
    getControls: async () => controls,
    setControls: async (patch) => (controls = { ...controls, ...patch }),
    onCardChanged: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };

  /** Someone else changes a card: update the server and push the change. */
  const pushChange = (change: CardChanged) => {
    const target = board(change.boardId);
    target.cards = target.cards.map((card) => (card.id === change.card.id ? structuredClone(change.card) : card));
    for (const listener of listeners) listener(change);
  };

  return { api, calls, pushChange, listenerCount: () => listeners.size };
}

export const LAUNCH: Board = {
  id: "launch",
  name: "Launch",
  wipLimits: { todo: null, doing: 2, done: null },
  cards: [
    { id: "c1", boardId: "launch", title: "Release notes", column: "todo", rank: 0, assignee: "Ada", commentCount: 1 },
    { id: "c2", boardId: "launch", title: "Demo video", column: "todo", rank: 1, assignee: null, commentCount: 0 },
    { id: "c3", boardId: "launch", title: "Pricing copy", column: "doing", rank: 0, assignee: "Grace", commentCount: 2 },
    { id: "c4", boardId: "launch", title: "Press kit", column: "done", rank: 0, assignee: null, commentCount: 0 },
  ],
};

export const BUGS: Board = {
  id: "bugs",
  name: "Bugs",
  wipLimits: { todo: null, doing: null, done: null },
  cards: [{ id: "b1", boardId: "bugs", title: "Crash on resume", column: "todo", rank: 0, assignee: null, commentCount: 0 }],
};
