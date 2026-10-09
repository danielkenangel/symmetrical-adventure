import type { Board, BoardSummary, Card, CardChanged, Column, Comment, ServerControls, WipLimits } from "../shared/api";
import { COLUMNS } from "../shared/api";

const PEOPLE = ["Ada", "Grace", "Linus", "Margaret", null] as const;

const SEED: Record<string, { name: string; titles: string[] }> = {
  launch: {
    name: "Launch",
    titles: [
      "Write release notes",
      "Record demo video",
      "Pricing page copy",
      "Press kit",
      "Beta feedback triage",
      "Status page",
      "Launch tweet thread",
      "Support macros",
    ],
  },
  website: {
    name: "Website",
    titles: ["New hero illustration", "Docs search", "Changelog RSS", "Cookie banner", "Blog redesign", "Careers page"],
  },
  bugs: {
    name: "Bugs",
    titles: [
      "Crash on resume",
      "Wrong timezone in exports",
      "Sidebar flickers",
      "Slow board load",
      "Duplicate notifications",
      "Drag preview offset",
      "Logout loop",
    ],
  },
};

/** An in-memory backend with latency, failures on demand, and simulated edits from other people. */
export class FakeServer {
  private readonly boards = new Map<string, Board>();
  private readonly comments = new Map<string, Comment[]>();
  private controls: ServerControls = { latencyMs: 400, failNext: false, remoteActivity: true, chatRate: 300 };
  private nextId = 1;
  private ticker: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly publish: (change: CardChanged) => void,
    private readonly onControls: (controls: ServerControls) => void = () => {},
  ) {
    for (const [boardId, { name, titles }] of Object.entries(SEED)) {
      const cards = titles.map((title, index) => this.makeCard(boardId, title, COLUMNS[index % 3]!, index));
      this.boards.set(boardId, { id: boardId, name, cards, wipLimits: { todo: null, doing: 3, done: null } });
    }
    this.syncTicker();
  }

  listBoards(): Promise<BoardSummary[]> {
    return this.respond(() => [...this.boards.values()].map(({ id, name }) => ({ id, name })));
  }

  getBoard(boardId: string): Promise<Board> {
    return this.respond(() => this.board(boardId));
  }

  getCard(cardId: string): Promise<Card> {
    return this.respond(() => this.card(cardId));
  }

  getComments(cardId: string): Promise<Comment[]> {
    return this.respond(() => this.comments.get(cardId) ?? []);
  }

  moveCard({ cardId, column }: { cardId: string; column: Column }): Promise<Card> {
    return this.respond(() => this.move(cardId, column), { mutation: true });
  }

  createCard({ boardId, title }: { boardId: string; title: string }): Promise<Card> {
    return this.respond(
      () => {
        const board = this.board(boardId);
        const card = this.makeCard(boardId, title, "todo", nextRank(board.cards, "todo"));
        board.cards.push(card);
        return card;
      },
      { mutation: true },
    );
  }

  setWipLimit({ boardId, column, limit }: { boardId: string; column: Column; limit: number | null }): Promise<WipLimits> {
    return this.respond(
      () => {
        const board = this.board(boardId);
        board.wipLimits = { ...board.wipLimits, [column]: limit };
        return board.wipLimits;
      },
      { mutation: true },
    );
  }

  getControls(): Promise<ServerControls> {
    return this.respond(() => this.controls, { latency: false });
  }

  setControls(patch: Partial<ServerControls>): Promise<ServerControls> {
    this.controls = { ...this.controls, ...patch };
    this.syncTicker();
    this.onControls(this.controls);
    return this.respond(() => this.controls, { latency: false });
  }

  dispose(): void {
    if (this.ticker) clearInterval(this.ticker);
  }

  private async respond<T>(read: () => T, options: { mutation?: boolean; latency?: boolean } = {}): Promise<T> {
    if (options.latency !== false) await sleep(this.controls.latencyMs);
    if (options.mutation && this.controls.failNext) {
      this.controls = { ...this.controls, failNext: false };
      throw new Error("The server rejected the change (simulated failure).");
    }
    return structuredClone(read());
  }

  private board(boardId: string): Board {
    const board = this.boards.get(boardId);
    if (!board) throw new Error(`No board ${boardId}`);
    return board;
  }

  private card(cardId: string): Card {
    for (const board of this.boards.values()) {
      const card = board.cards.find((candidate) => candidate.id === cardId);
      if (card) return card;
    }
    throw new Error(`No card ${cardId}`);
  }

  private move(cardId: string, column: Column): Card {
    const card = this.card(cardId);
    if (card.column !== column) {
      card.rank = nextRank(this.board(card.boardId).cards, column);
      card.column = column;
    }
    return card;
  }

  private makeCard(boardId: string, title: string, column: Column, rank: number): Card {
    const id = `card-${this.nextId++}`;
    const commentCount = this.nextId % 4;
    this.comments.set(
      id,
      Array.from({ length: commentCount }, (_, index) => ({
        id: `${id}-comment-${index}`,
        cardId: id,
        author: PEOPLE[(this.nextId + index) % 4]!,
        body: ["Looks good to me.", "Can we split this up?", "Blocked on design.", "Shipping this week."][index % 4]!,
      })),
    );
    return { id, boardId, title, column, rank, assignee: PEOPLE[this.nextId % PEOPLE.length]!, commentCount };
  }

  /** Every few seconds, "someone else" moves a random card to another column. */
  private syncTicker(): void {
    if (this.controls.remoteActivity && !this.ticker) {
      this.ticker = setInterval(() => {
        const boards = [...this.boards.values()];
        const board = boards[Math.floor(Math.random() * boards.length)]!;
        const card = board.cards[Math.floor(Math.random() * board.cards.length)]!;
        const others = COLUMNS.filter((column) => column !== card.column);
        const moved = this.move(card.id, others[Math.floor(Math.random() * others.length)]!);
        this.publish({ boardId: board.id, card: structuredClone(moved) });
      }, 4000);
    } else if (!this.controls.remoteActivity && this.ticker) {
      clearInterval(this.ticker);
      this.ticker = null;
    }
  }
}

function nextRank(cards: readonly Card[], column: Column): number {
  return Math.max(-1, ...cards.filter((card) => card.column === column).map((card) => card.rank)) + 1;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
