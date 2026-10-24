import React from "react";
import { StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { Challenge } from "@/data/seed";
import { useColors } from "@/hooks/useColors";
import { Badge, Body, Card, H3, Small } from "@/components/primitives";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/radius";

interface Props {
  challenge: Challenge;
  status: "available" | "active" | "completed";
  onPress: () => void;
}

export default function ChallengeCard({ challenge, status, onPress }: Props) {
  const colors = useColors();

  const statusConfig = {
    available: { label: "Start", tone: colors.primary },
    active: { label: "In Progress", tone: colors.accent },
    completed: { label: "Completed", tone: colors.success },
  }[status];

  return (
    <Card variant="outline" pressable onPress={onPress} style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: challenge.color + "22" }]}>
        <Feather name={challenge.iconName as never} size={22} color={challenge.color} />
      </View>
      <View style={styles.content}>
        <View style={styles.row}>
          <H3 style={{ flex: 1 }} numberOfLines={1}>{challenge.title}</H3>
          {challenge.isPremium && status === "available" && (
            <Badge label="PRO" tone={colors.warning} variant="solid" icon="lock" />
          )}
        </View>
        <Body color={colors.mutedForeground} numberOfLines={2} style={styles.desc}>{challenge.description}</Body>
        <View style={styles.footer}>
          <View style={styles.metaRow}>
            <Feather name="clock" size={12} color={colors.mutedForeground} />
            <Small color={colors.mutedForeground}>{challenge.duration}</Small>
            <Badge label={challenge.category} tone={challenge.color} variant="soft" />
          </View>
          <Badge label={statusConfig.label} tone={statusConfig.tone} variant="solid" icon={status === "completed" ? "check" : undefined} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  iconWrap: { width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center", marginTop: 2 },
  content: { flex: 1, gap: spacing.xs },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  desc: { fontSize: 13, lineHeight: 18 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.xs },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
});
