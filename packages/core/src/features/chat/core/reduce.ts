import type { ChatEvent, ChatMessage } from "@state-demo/api";

/** How many messages a room keeps. Older ones scroll away, like Twitch chat. */
export const MAX_MESSAGES = 150;

export interface ChatState {
  /** Oldest first. A new array only when messages arrive or leave, so a hype-only update keeps it. */
  messageIds: readonly string[];
  messages: Readonly<Record<string, ChatMessage>>;
  /** Events applied so far. */
  received: number;
}

export const EMPTY_CHAT: ChatState = { messageIds: [], messages: {}, received: 0 };

/**
 * Applies a batch of events. Pure, and structurally shared: a message that didn't change keeps its
 * object, so a line that selects it doesn't re-render.
 */
export function reduce(state: ChatState, events: readonly ChatEvent[]): ChatState {
  const messages = { ...state.messages };
  let messageIds = state.messageIds;
  for (const event of events) {
    if (event.type === "message") {
      if (messageIds === state.messageIds) messageIds = [...messageIds];
      (messageIds as string[]).push(event.message.id);
      messages[event.message.id] = event.message;
    } else {
      const message = messages[event.messageId];
      if (message) messages[event.messageId] = { ...message, hype: message.hype + 1 };
    }
  }
  if (messageIds.length > MAX_MESSAGES) {
    const dropped = messageIds.slice(0, messageIds.length - MAX_MESSAGES);
    for (const id of dropped) delete messages[id];
    messageIds = messageIds.slice(-MAX_MESSAGES);
  }
  return { messageIds, messages, received: state.received + events.length };
}
