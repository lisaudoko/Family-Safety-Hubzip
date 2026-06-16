import React from "react";
import { ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
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
      <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onAction}>
          <Text style={[styles.sectionAction, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>{action}</Text>
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

export function EmptyState({ icon, title, subtitle, action, onAction }: { icon: string; title: string; subtitle?: string; action?: string; onAction?: () => void }) {
  const colors = useColors();
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
        <Feather name={icon as never} size={28} color={colors.mutedForeground} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{title}</Text>
      {subtitle && <Text style={[styles.emptySubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{subtitle}</Text>}
      {action && (
        <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: colors.primary }]} onPress={onAction}>
          <Text style={[styles.emptyBtnText, { fontFamily: "Inter_600SemiBold" }]}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function PremiumBadge() {
  return (
    <View style={styles.premiumBadge}>
      <Feather name="lock" size={10} color="#FFFFFF" />
      <Text style={styles.premiumText}>PRO</Text>
    </View>
  );
}

export function CategoryPill({ label, color }: { label: string; color?: string }) {
  const colors = useColors();
  return (
    <View style={[styles.pill, { backgroundColor: (color ?? colors.secondary) + "22" }]}>
      <Text style={[styles.pillText, { color: color ?? colors.primary, fontFamily: "Inter_500Medium" }]}>{label}</Text>
    </View>
  );
}

export function ScoreRing({ score, max, size = 80 }: { score: number; max: number; size?: number }) {
  const colors = useColors();
  const pct = max > 0 ? score / max : 0;
  const pctLabel = Math.round(pct * 100);
  const color = pct >= 0.7 ? colors.success : pct >= 0.4 ? colors.warning : colors.destructive;
  return (
    <View style={[styles.ring, { width: size, height: size, borderRadius: size / 2, borderColor: color, borderWidth: 4 }]}>
      <Text style={[styles.ringScore, { color, fontFamily: "Inter_700Bold", fontSize: size * 0.28 }]}>{pctLabel}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  progressTrack: { height: 6, borderRadius: 3, overflow: "hidden", width: "100%" },
  progressFill: { height: "100%", borderRadius: 3 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 18 },
  sectionAction: { fontSize: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingVertical: 40, gap: 12 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 18, textAlign: "center" },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  emptyBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { color: "#FFFFFF", fontSize: 14 },
  premiumBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#F5A623", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, gap: 3 },
  premiumText: { color: "#FFFFFF", fontSize: 10, fontFamily: "Inter_700Bold" },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  pillText: { fontSize: 12 },
  ring: { alignItems: "center", justifyContent: "center" },
  ringScore: {},
});
