import { memo } from "react";

import { PanelHeader } from "../../../platform/ui/primitives";
import { RoomContext, useChat, useWatchedRoom } from "../hooks";

/**
 * The board's chat, as side-panel content: the shell owns the panel. It puts the room's store in
 * context (a handle, which never changes); each component below selects only what it shows:
 *
 * - the count, the events received (once per frame while events arrive);
 * - the log, the message IDs (once per frame in which a message arrived);
 * - each line, its own message (only when that message changes).
 */
export function ChatPanel({ boardId }: { boardId: string }) {
  const room = useWatchedRoom(boardId);
  return (
    <RoomContext value={room}>
      <PanelHeader title="Board chat">
        <ChatCount />
      </PanelHeader>
      <ChatLog />
    </RoomContext>
  );
}

function ChatCount() {
  const received = useChat((s) => s.received);
  return <span className="muted panel-meta">{received} events</span>;
}

function ChatLog() {
  const messageIds = useChat((s) => s.messageIds);
  return (
    // Reversed in a column-reverse list: the newest line sits at the bottom, and the list stays
    // scrolled to it without any scroll code.
    <ol className="panel-body chat-log" aria-label="Board chat">
      {messageIds.toReversed().map((id) => (
        <ChatLine key={id} messageId={id} />
      ))}
    </ol>
  );
}

// memo: the compiler memoizes elements in a component's body, but not the ones built in a .map, so
// without it every line re-renders whenever the log does.
const ChatLine = memo(function ChatLine({ messageId }: { messageId: string }) {
  const message = useChat((s) => s.messages[messageId]);
  if (!message) return null;
  return (
    <li className="chat-line">
      <b>{message.author}</b> {message.text}
      {message.hype > 0 && <span className="hype">🔥 {message.hype}</span>}
    </li>
  );
});
