import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useCardActions, useCardQuery } from "@state-demo/core/features/cards";

import { colors } from "../../ui/primitives";

export interface CardTileProps {
  cardId: string;
  selected: boolean;
  onSelect: (cardId: string) => void;
  /** Controls from whoever places the card, such as a board's move buttons. */
  actions?: ReactNode;
}

/** A card in a list. Reads its own entry, and warms its comments on touch so opening it is instant. */
export function CardTile({ cardId, selected, onSelect, actions }: CardTileProps) {
  const { data: card, isPending } = useCardQuery(cardId);
  const { prefetchComments } = useCardActions();
  if (isPending || !card) {
    return (
      <View style={[styles.card, styles.ghost]}>
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }
  return (
    <Pressable
      style={[styles.card, selected && styles.selected]}
      onPressIn={() => prefetchComments(cardId)}
      onPress={() => onSelect(cardId)}
    >
      <Text style={styles.title}>{card.title}</Text>
      <View style={styles.meta}>
        <Text style={styles.muted}>{card.assignee ?? "Unassigned"}</Text>
        {card.commentCount > 0 && <Text style={styles.muted}>{card.commentCount} comments</Text>}
      </View>
      {actions && <View style={styles.actions}>{actions}</View>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.line, padding: 12, gap: 4 },
  selected: { borderColor: colors.accent },
  ghost: { borderStyle: "dashed" },
  title: { fontSize: 15, color: colors.fg },
  meta: { flexDirection: "row", justifyContent: "space-between" },
  muted: { fontSize: 12, color: colors.muted },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 6, marginTop: 4 },
});
