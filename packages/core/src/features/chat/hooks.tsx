import { createContext, use, useEffect, type ReactNode } from "react";

import { createFeatureContext } from "../../platform/react/featureContext";
import { selectFrom } from "../../platform/react/select";
import type { Chat, ChatRoomStore } from "./core";

const [ChatProvider, useChatCore] = createFeatureContext<Chat>("chat");
export { ChatProvider };

/** The room being shown. A handle: it never changes while the panel is open. */
const RoomContext = createContext<ChatRoomStore | null>(null);

/**
 * Puts a board's chat room in context for the hooks below, streaming while it's mounted. Mounting is
 * the intent ("this chat is visible"); the core owns the stream.
 */
export function ChatRoomProvider({ boardId, children }: { boardId: string; children: ReactNode }) {
  const chat = useChatCore();
  useEffect(() => chat.watch(boardId), [chat, boardId]);
  return <RoomContext value={chat.room(boardId)}>{children}</RoomContext>;
}

function useRoom(): ChatRoomStore {
  const room = use(RoomContext);
  if (!room) throw new Error("Chat hooks need a ChatRoomProvider above them.");
  return room;
}
const select = selectFrom(useRoom);

/** How many events the room has received. */
export const useReceivedCount = select((s) => s.received);
/** The kept messages' IDs, oldest first. The same array until a message arrives or is dropped. */
export const useMessageIds = select((s) => s.messageIds);
/** One message; re-renders only when it changes. */
export const useMessage = select((s, messageId: string) => s.messages[messageId]);
