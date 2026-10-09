/** Presentational components: props only, plain values only. They never import a feature. */

import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export const colors = {
  bg: "#f6f7f9",
  surface: "#ffffff",
  sidebar: "#eef0f4",
  fg: "#1b2130",
  muted: "#687284",
  line: "#dde1e8",
  accent: "#3157d5",
  accentSoft: "#e4eafc",
  warn: "#b4410c",
  warnSoft: "#fdebe1",
  skeleton: "#e6e9ef",
};

export function Badge({ count, pending }: { count: number; pending: boolean }) {
  if (pending) return <View style={[styles.badge, styles.badgePending]} accessibilityLabel="Loading" />;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count}</Text>
    </View>
  );
}

export function SkeletonLines({ lines }: { lines: number }) {
  return (
    <View style={styles.skeletonLines} accessibilityLabel="Loading">
      {Array.from({ length: Math.max(1, lines) }, (_, index) => (
        <View key={index} style={styles.skeletonLine} />
      ))}
    </View>
  );
}

export function BoardSkeleton() {
  return (
    <View style={styles.boardSkeleton} accessibilityLabel="Loading board">
      {[0, 1, 2].map((index) => (
        <SkeletonLines key={index} lines={3} />
      ))}
    </View>
  );
}

/** The header every full-screen panel uses: a title, and controls on the right. */
export function PanelHeader({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <View style={styles.panelHeader}>
      <Text style={styles.panelTitle} numberOfLines={1}>
        {title}
      </Text>
      {children}
    </View>
  );
}

export interface ButtonProps {
  label: string;
  onPress: () => void;
  /** For a button whose label is a symbol (→, ✕). */
  accessibilityLabel?: string;
  disabled?: boolean;
  active?: boolean;
}

export function Button({ label, onPress, accessibilityLabel, disabled, active }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, selected: active }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, active && styles.buttonActive, disabled && styles.buttonDisabled]}
    >
      <Text style={[styles.buttonText, active && styles.buttonTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: { minWidth: 22, paddingHorizontal: 6, borderRadius: 999, backgroundColor: colors.accentSoft, alignItems: "center" },
  badgePending: { width: 22, height: 14, backgroundColor: colors.skeleton },
  badgeText: { fontSize: 12, color: colors.accent },
  skeletonLines: { gap: 8, paddingVertical: 4 },
  skeletonLine: { height: 12, borderRadius: 4, backgroundColor: colors.skeleton },
  boardSkeleton: { gap: 16, padding: 16 },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.surface,
  },
  panelTitle: { flex: 1, fontSize: 17, fontWeight: "600", color: colors.fg },
  button: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  buttonActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: colors.fg },
  buttonTextActive: { color: colors.accent, fontWeight: "600" },
});
