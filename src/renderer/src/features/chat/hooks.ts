import { createContext, use, useEffect } from "react";

import { createFeatureContext } from "../../platform/react/featureContext";
import { selectFrom } from "../../platform/react/select";
import type { Chat, ChatRoomStore } from "./core";

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

function useRoom(): ChatRoomStore {
  const room = use(RoomContext);
  if (!room) throw new Error("Chat hooks need a ChatPanel above them.");
  return room;
}
const select = selectFrom(useRoom);

/** How many events the room has received. */
export const useReceivedCount = select((s) => s.received);
/** The kept messages' IDs, oldest first. The same array until a message arrives or is dropped. */
export const useMessageIds = select((s) => s.messageIds);
/** One message; re-renders only when it changes. */
export const useMessage = select((s, messageId: string) => s.messages[messageId]);
