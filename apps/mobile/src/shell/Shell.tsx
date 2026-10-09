import { memo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useBoardListQuery, useCurrentBoardIdQuery, useOpenCardIdQuery } from "@state-demo/core/features/boards";
import { useChatOpen, useNavigationActions } from "@state-demo/core/features/navigation";
import { BoardView, SelectedCard } from "@state-demo/ui-native/features/boards";
import { ChatPanel } from "@state-demo/ui-native/features/chat";
import { BoardSkeleton, Button, colors } from "@state-demo/ui-native/ui";

/**
 * The mobile layout: board tabs, then one screen. What desktop shows in its side panel (the chat or
 * the open card) takes the whole screen here; the navigation state is the same, the shell decides.
 */
export function Shell() {
  const boardId = useCurrentBoardIdQuery().data;
  return (
    <SafeAreaView style={styles.shell}>
      <BoardTabs />
      {boardId ? <Screen key={boardId} boardId={boardId} /> : <BoardSkeleton />}
    </SafeAreaView>
  );
}

function Screen({ boardId }: { boardId: string }) {
  const chatOpen = useChatOpen();
  const cardId = useOpenCardIdQuery(boardId).data;
  const { toggleChat } = useNavigationActions();
  if (chatOpen) return <ChatPanel boardId={boardId} onClose={toggleChat} />;
  if (cardId) return <SelectedCard boardId={boardId} />;
  return <BoardView boardId={boardId} />;
}

function BoardTabs() {
  const boards = useBoardListQuery().data ?? [];
  return (
    <View style={styles.tabs}>
      <ScrollView horizontal contentContainerStyle={styles.tabsContent} showsHorizontalScrollIndicator={false}>
        {boards.map(({ id, name }) => (
          <BoardTab key={id} boardId={id} name={name} />
        ))}
      </ScrollView>
    </View>
  );
}

const BoardTab = memo(function BoardTab({ boardId, name }: { boardId: string; name: string }) {
  const active = useCurrentBoardIdQuery().data === boardId;
  const { showBoard } = useNavigationActions();
  return <Button label={name} active={active} onPress={() => showBoard(boardId)} />;
});

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.bg },
  tabs: { borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.sidebar },
  tabsContent: { gap: 6, padding: 8 },
});
