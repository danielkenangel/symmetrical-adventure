import { memo } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { ChatRoomProvider, useMessage, useMessageIds, useReceivedCount } from "@state-demo/core/features/chat";

import { Button, colors, PanelHeader } from "../../ui/primitives";

/**
 * The board's chat, full screen. The same hooks as the DOM ChatPanel, so the same render counts:
 *
 * - the count, the events received (once per frame while events arrive);
 * - the log, the message IDs (once per frame in which a message arrived);
 * - each line, its own message (only when that message changes).
 *
 * `onClose` is where the shell takes the user back to; the panel doesn't know.
 */
export function ChatPanel({ boardId, onClose }: { boardId: string; onClose: () => void }) {
  return (
    <ChatRoomProvider boardId={boardId}>
      <View style={styles.panel}>
        <PanelHeader title="Board chat">
          <ChatCount />
          <Button label="✕" accessibilityLabel="Close" onPress={onClose} />
        </PanelHeader>
        <ChatLog />
      </View>
    </ChatRoomProvider>
  );
}

function ChatCount() {
  const received = useReceivedCount();
  return <Text style={styles.muted}>{received} events</Text>;
}

function ChatLog() {
  const messageIds = useMessageIds();
  // Inverted: the newest line sits at the bottom, and the list stays scrolled to it.
  return (
    <FlatList
      inverted
      data={[...messageIds].reverse()}
      keyExtractor={(id) => id}
      renderItem={({ item }) => <ChatLine messageId={item} />}
      contentContainerStyle={styles.log}
    />
  );
}

// memo: rows are built by FlatList's renderItem, which the compiler doesn't memoize, so without it
// every visible line re-renders whenever the log does.
const ChatLine = memo(function ChatLine({ messageId }: { messageId: string }) {
  const message = useMessage(messageId);
  if (!message) return null;
  return (
    <Text style={styles.line}>
      <Text style={styles.author}>{message.author}</Text> {message.text}
      {message.hype > 0 && <Text style={styles.hype}> 🔥 {message.hype}</Text>}
    </Text>
  );
});

const styles = StyleSheet.create({
  panel: { flex: 1, backgroundColor: colors.surface },
  log: { padding: 12, gap: 4 },
  line: { color: colors.fg },
  author: { fontWeight: "600" },
  hype: { color: colors.warn },
  muted: { color: colors.muted },
});
