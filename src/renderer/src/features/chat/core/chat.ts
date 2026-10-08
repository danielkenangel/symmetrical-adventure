import { createStore } from "zustand/vanilla";

import type { Api, ChatEvent } from "../../../../../shared/api";
import { onNextFrame } from "../../../platform/core/frame";
import { EMPTY_CHAT, reduce, type ChatState } from "./reduce";

export interface ChatDeps {
  api: Api;
}

/**
 * One board's chat. Events arrive hundreds of times a second; they're queued and applied once per
 * frame, so readers see at most one update per frame however fast the stream is.
 */
function createRoom() {
  const store = createStore<ChatState>()(() => EMPTY_CHAT);
  let queue: ChatEvent[] = [];
  let cancel: (() => void) | null = null;
  const flush = () => {
    cancel = null;
    const events = queue;
    queue = [];
    store.setState((state) => reduce(state, events));
  };
  return {
    store,
    push(event: ChatEvent): void {
      queue.push(event);
      cancel ??= onNextFrame(flush);
    },
    pause(): void {
      cancel?.();
      cancel = null;
      queue = [];
    },
  };
}

export type ChatRoomStore = ReturnType<typeof createRoom>["store"];

export function createChat(deps: ChatDeps) {
  const rooms = new Map<string, ReturnType<typeof createRoom>>();
  const watches = new Map<string, { count: number; stop: () => void }>();

  const room = (boardId: string) => {
    let existing = rooms.get(boardId);
    if (!existing) {
      existing = createRoom();
      rooms.set(boardId, existing);
    }
    return existing;
  };

  return {
    /** A board's chat store. Building it does nothing; the stream starts only when it's watched. */
    room(boardId: string): ChatRoomStore {
      return room(boardId).store;
    },
    /**
     * Streams a board's chat while at least one watcher holds it. Returns the release. History is
     * kept after the last release, so reopening a board shows the chat it had.
     */
    watch(boardId: string): () => void {
      const existing = watches.get(boardId);
      if (existing) existing.count++;
      else watches.set(boardId, { count: 1, stop: deps.api.watchChat(boardId, (event) => room(boardId).push(event)) });
      return () => {
        const watch = watches.get(boardId);
        if (!watch || --watch.count > 0) return;
        watch.stop();
        room(boardId).pause();
        watches.delete(boardId);
      };
    },
  };
}

export type Chat = ReturnType<typeof createChat>;
