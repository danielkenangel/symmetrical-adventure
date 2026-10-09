import { memo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { COLUMN_TITLES, COLUMNS, type Column } from "@state-demo/api";
import {
  ApplauseProvider,
  FilterMatchesProvider,
  useApplause,
  useApplauseActions,
  useApplauseSnapshots,
  useBoardActions,
  useBoardFilter,
  useBoardNameQuery,
  useBoardQuery,
  useColumnQuery,
  useMatchingCardIds,
  useMoveErrorMutation,
  usePendingCardsMutation,
} from "@state-demo/core/features/boards";
import { useChatOpen, useIsSelectedCard, useNavigationActions } from "@state-demo/core/features/navigation";

import { BoardSkeleton, Button, colors } from "../../ui/primitives";
import { CardTile } from "../cards";

/**
 * A board and its cards, columns stacked for a phone. The same components and hooks as the DOM
 * BoardView: each takes IDs and reads its own slice, so a change re-renders only what changed.
 */
export function BoardView({ boardId }: { boardId: string }) {
  if (useBoardQuery(boardId).isPending) return <BoardSkeleton />;
  return (
    <View style={styles.board}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <BoardName boardId={boardId} />
          <Applause boardId={boardId} />
        </View>
        <FilterInput boardId={boardId} />
        <NewCard boardId={boardId} />
        <MoveError boardId={boardId} />
        <FilterMatchesProvider boardId={boardId}>
          {COLUMNS.map((column) => (
            <ColumnView key={column} boardId={boardId} column={column} />
          ))}
        </FilterMatchesProvider>
      </ScrollView>
      <ChatToggle />
    </View>
  );
}

/** Opens the board chat. Floats at the bottom of the board. */
function ChatToggle() {
  const open = useChatOpen();
  const { toggleChat } = useNavigationActions();
  return (
    <View style={styles.chatToggle}>
      <Button label="Board chat" active={open} onPress={toggleChat} />
    </View>
  );
}

/** Kept per board after you leave it, for the two most recent boards (see `boards.applause`). */
function Applause({ boardId }: { boardId: string }) {
  return (
    <ApplauseProvider key={boardId} id={boardId} snapshots={useApplauseSnapshots()}>
      <ApplauseButton />
    </ApplauseProvider>
  );
}

function ApplauseButton() {
  const count = useApplause();
  const { clap } = useApplauseActions();
  return <Button label={`👏 ${count}`} accessibilityLabel="Applaud this board" onPress={clap} />;
}

function BoardName({ boardId }: { boardId: string }) {
  return <Text style={styles.name}>{useBoardNameQuery(boardId).data}</Text>;
}

function FilterInput({ boardId }: { boardId: string }) {
  const filter = useBoardFilter(boardId);
  const { setFilter } = useBoardActions();
  return (
    <TextInput
      style={styles.input}
      value={filter}
      onChangeText={(text) => setFilter(boardId, text)}
      placeholder="Filter cards"
      accessibilityLabel="Filter cards"
    />
  );
}

function MoveError({ boardId }: { boardId: string }) {
  const error = useMoveErrorMutation(boardId);
  return error && <Text style={styles.error}>{error} The move was undone.</Text>;
}

function ColumnView({ boardId, column }: { boardId: string; column: Column }) {
  const { cardIds, limit } = useColumnQuery(boardId, column).data ?? NO_COLUMN;
  const shownIds = useMatchingCardIds(cardIds);
  // The WIP limit counts the whole column, whatever the filter shows.
  const overLimit = limit !== null && cardIds.length > limit;
  return (
    <View style={[styles.column, overLimit && styles.overLimit]}>
      <View style={styles.columnHeader}>
        <Text style={styles.columnTitle}>{COLUMN_TITLES[column]}</Text>
        <Text style={styles.muted}>
          {shownIds.length === cardIds.length ? cardIds.length : `${shownIds.length} of ${cardIds.length}`}
          {limit !== null && ` / ${limit}`}
        </Text>
      </View>
      {overLimit && <Text style={styles.limitWarning}>Over the WIP limit</Text>}
      {shownIds.map((cardId) => (
        <BoardCard key={cardId} boardId={boardId} cardId={cardId} column={column} />
      ))}
      {column === "todo" && <PendingCards boardId={boardId} />}
    </View>
  );
}

/** A card as this board places it: the cards feature's tile, plus the board's move controls. A list row, so memo. */
const BoardCard = memo(function BoardCard({ boardId, cardId, column }: { boardId: string; cardId: string; column: Column }) {
  const selected = useIsSelectedCard(cardId);
  const { selectCard } = useNavigationActions();
  const { moveCard } = useBoardActions();
  const index = COLUMNS.indexOf(column);
  const previous = COLUMNS[index - 1];
  const next = COLUMNS[index + 1];
  return (
    <CardTile
      cardId={cardId}
      selected={selected}
      onSelect={selectCard}
      actions={
        <>
          <Button
            label="←"
            accessibilityLabel="Move left"
            disabled={!previous}
            onPress={() => previous && moveCard(boardId, cardId, previous)}
          />
          <Button label="→" accessibilityLabel="Move right" disabled={!next} onPress={() => next && moveCard(boardId, cardId, next)} />
        </>
      }
    />
  );
});

function PendingCards({ boardId }: { boardId: string }) {
  return usePendingCardsMutation(boardId).map(({ id, title }) => (
    <View key={id} style={styles.ghost}>
      <Text style={styles.muted}>{title}</Text>
    </View>
  ));
}

function NewCard({ boardId }: { boardId: string }) {
  const name = useBoardNameQuery(boardId).data;
  const { createCard } = useBoardActions();
  const [title, setTitle] = useState("");
  const submit = () => {
    if (!title.trim()) return;
    void createCard(boardId, title.trim());
    setTitle("");
  };
  return (
    <View style={styles.newCard}>
      <TextInput
        style={[styles.input, styles.grow]}
        value={title}
        onChangeText={setTitle}
        onSubmitEditing={submit}
        placeholder={`Add a card to ${name ?? ""}`}
        accessibilityLabel="New card title"
      />
      <Button label="Add" onPress={submit} />
    </View>
  );
}

const NO_COLUMN = { cardIds: [] as readonly string[], limit: null };

const styles = StyleSheet.create({
  board: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 80 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  name: { flex: 1, fontSize: 22, fontWeight: "700", color: colors.fg },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    color: colors.fg,
  },
  grow: { flex: 1 },
  newCard: { flexDirection: "row", gap: 8 },
  error: { padding: 10, borderRadius: 6, backgroundColor: colors.warnSoft, color: colors.warn },
  column: { gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.sidebar },
  overLimit: { borderColor: colors.warn, backgroundColor: colors.warnSoft },
  columnHeader: { flexDirection: "row", justifyContent: "space-between" },
  columnTitle: { fontWeight: "600", color: colors.fg },
  limitWarning: { fontSize: 12, color: colors.warn },
  muted: { color: colors.muted },
  ghost: { padding: 12, borderRadius: 8, borderWidth: 1, borderStyle: "dashed", borderColor: colors.line },
  chatToggle: { position: "absolute", left: 16, bottom: 16 },
});
