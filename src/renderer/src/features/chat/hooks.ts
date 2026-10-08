import { createContext, use, useEffect } from "react";
import { useStoreWithEqualityFn } from "zustand/traditional";

import { createFeatureContext } from "../../platform/react/featureContext";
import type { Chat, ChatRoomStore, ChatState } from "./core";

const [ChatProvider, useChatCore] = createFeatureContext<Chat>("chat");
export { ChatProvider };

/** The room being shown. A handle: it never changes while the panel is open. */
export const RoomContext = createContext<ChatRoomStore | null>(null);

/**
 * The board's chat room, streaming while this component is mounted. Mounting is the intent ("this
 * chat is visible"); the core owns the stream.
 */
export function useWatchedRoom(boardId: string): ChatRoomStore {
  const chat = useChatCore();
  useEffect(() => chat.watch(boardId), [chat, boardId]);
  return chat.room(boardId);
}

/**
 * A slice of the room being shown. Zustand's wrapper over useSyncExternalStoreWithSelector: the
 * component re-renders only when its selection changes, compared with `equality`.
 */
export function useChat<T>(selector: (state: ChatState) => T, equality?: (a: T, b: T) => boolean): T {
  const room = use(RoomContext);
  if (!room) throw new Error("useChat needs a ChatPanel above it.");
  return useStoreWithEqualityFn(room, selector, equality);
}
