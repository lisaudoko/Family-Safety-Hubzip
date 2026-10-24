import React from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { AppText } from "@/components/AppText";
import { fontFamily, typeScale } from "@/constants/typography";
import { radius } from "@/constants/radius";
import { spacing } from "@/constants/spacing";
import { useColors } from "@/hooks/useColors";

export function ProgressBar({ value, total, color }: { value: number; total: number; color?: string }) {
  const colors = useColors();
  const pct = total > 0 ? Math.min(value / total, 1) : 0;
  return (
    <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
      <View style={[styles.progressFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: color ?? colors.primary }]} />
    </View>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const colors = useColors();
  return (
    <View style={styles.sectionHeader}>
      <AppText style={[typeScale.h2, { color: colors.foreground }]}>{title}</AppText>
      {action && (
        <TouchableOpacity onPress={onAction}>
          <AppText style={{ color: colors.primary, fontSize: 14, fontFamily: fontFamily.semibold }}>{action}</AppText>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function LoadingSpinner({ size = "large" }: { size?: "small" | "large" }) {
  const colors = useColors();
  return (
    <View style={styles.center}>
      <ActivityIndicator size={size} color={colors.primary} />
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  subtitle,
  action,
  onAction,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
        <Feather name={icon as never} size={28} color={colors.mutedForeground} />
      </View>
      <AppText style={[typeScale.h3, { color: colors.foreground, textAlign: "center" }]}>{title}</AppText>
      {subtitle && (
        <AppText style={[typeScale.body, { color: colors.mutedForeground, textAlign: "center" }]}>{subtitle}</AppText>
      )}
      {action && (
        <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: colors.primary }]} onPress={onAction}>
          <AppText style={{ color: colors.primaryForeground, fontSize: 14, fontFamily: fontFamily.semibold }}>{action}</AppText>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  progressTrack: { height: 6, borderRadius: 3, overflow: "hidden", width: "100%" },
  progressFill: { height: "100%", borderRadius: 3 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xxxl, paddingVertical: spacing.huge, gap: spacing.md },
  emptyIcon: { width: 64, height: 64, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  emptyBtn: { marginTop: spacing.sm, paddingHorizontal: spacing.xxl, paddingVertical: spacing.md, borderRadius: radius.md },
});
