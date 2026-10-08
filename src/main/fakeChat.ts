import type { ChatEvent, ChatMessage } from "../shared/api";

const AUTHORS = ["kanban_enjoyer", "wip_limit_andy", "ada_l", "grace_h", "linus_t", "pm_dave", "qa_queen", "standup_skipper", "ticket_goblin", "burndown_bro"];
const LINES = [
  "move it to done!!",
  "WIP limit KEKW",
  "ship it",
  "who assigned this to Linus again",
  "that card has been in progress for 3 sprints",
  "PogChamp",
  "is this a bug or a feature",
  "LGTM",
  "blocked on design",
  "first",
  "can we split this up",
  "standup in 5",
  "done column looking empty today",
  "o7",
  "it works on my machine",
];
const HYPE_SHARE = 0.4; // of events: a hype on a recent message, rather than a new message
const TICK_MS = 10;

/**
 * A fake chat backend: while a board is watched, emits events at `rate` per second, one at a time,
 * the way a WebSocket would.
 */
export class FakeChat {
  private readonly rooms = new Map<string, { watchers: number; recent: string[]; timer: ReturnType<typeof setInterval>; owed: number }>();
  private nextId = 1;

  constructor(
    private readonly publish: (boardId: string, event: ChatEvent) => void,
    private rate: number,
  ) {}

  setRate(rate: number): void {
    this.rate = rate;
  }

  watch(boardId: string): void {
    const room = this.rooms.get(boardId);
    if (room) {
      room.watchers++;
      return;
    }
    const created = { watchers: 1, recent: [] as string[], owed: 0, timer: setInterval(() => this.tick(boardId), TICK_MS) };
    this.rooms.set(boardId, created);
  }

  unwatch(boardId: string): void {
    const room = this.rooms.get(boardId);
    if (!room || --room.watchers > 0) return;
    clearInterval(room.timer);
    this.rooms.delete(boardId);
  }

  dispose(): void {
    for (const room of this.rooms.values()) clearInterval(room.timer);
    this.rooms.clear();
  }

  private tick(boardId: string): void {
    const room = this.rooms.get(boardId)!;
    room.owed += (this.rate * TICK_MS) / 1000;
    for (; room.owed >= 1; room.owed--) {
      if (room.recent.length > 0 && Math.random() < HYPE_SHARE) {
        this.publish(boardId, { type: "hype", messageId: room.recent[Math.floor(Math.random() * room.recent.length)]! });
        continue;
      }
      const message: ChatMessage = {
        id: `chat-${this.nextId++}`,
        boardId,
        author: pick(AUTHORS),
        text: pick(LINES),
        hype: 0,
      };
      room.recent = [...room.recent.slice(-19), message.id];
      this.publish(boardId, { type: "message", message });
    }
  }
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}
