import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useCardQuery, useCommentsQuery } from "@state-demo/core/features/cards";

import { Button, colors, PanelHeader, SkeletonLines } from "../../ui/primitives";

export interface CardDetailProps {
  cardId: string;
  onClose: () => void;
  /** Fields from whoever placed the card, such as its board column: [label, value] pairs. */
  fields?: ReactNode;
}

/**
 * A card's detail, as full-screen content: the shell owns the screen. The card opens instantly from
 * its cached content; only its comments load (and they were probably prefetched on touch).
 */
export function CardDetail({ cardId, onClose, fields }: CardDetailProps) {
  const card = useCardQuery(cardId).data;
  return (
    <View style={styles.panel}>
      <PanelHeader title={card?.title}>
        <Button label="✕" accessibilityLabel="Close" onPress={onClose} />
      </PanelHeader>
      <ScrollView contentContainerStyle={styles.body}>
        {fields}
        <Field label="Assignee" value={card?.assignee ?? "Unassigned"} />
        <Text style={styles.heading}>COMMENTS</Text>
        <Comments cardId={cardId} expected={card?.commentCount ?? 1} />
      </ScrollView>
    </View>
  );
}

/** One label and value in a card's detail. */
export function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function Comments({ cardId, expected }: { cardId: string; expected: number }) {
  const { data: comments, isPending } = useCommentsQuery(cardId);
  if (isPending || !comments) return <SkeletonLines lines={expected} />;
  if (comments.length === 0) return <Text style={styles.muted}>No comments yet.</Text>;
  return comments.map((comment) => (
    <Text key={comment.id} style={styles.comment}>
      <Text style={styles.author}>{comment.author}</Text> {comment.body}
    </Text>
  ));
}

const styles = StyleSheet.create({
  panel: { flex: 1, backgroundColor: colors.surface },
  body: { padding: 16, gap: 10 },
  field: { flexDirection: "row", gap: 12 },
  value: { color: colors.fg },
  heading: { marginTop: 8, fontSize: 12, fontWeight: "600", letterSpacing: 1, color: colors.muted },
  comment: { color: colors.fg },
  author: { fontWeight: "600" },
  muted: { width: 80, color: colors.muted },
});
