import React from "react";
import { StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { WeeklyTip } from "@/data/seed";
import { Body, Card, H3, Small } from "@/components/primitives";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/radius";
import { useColors } from "@/hooks/useColors";

interface Props {
  tip: WeeklyTip;
}

export default function TipCard({ tip }: Props) {
  const colors = useColors();
  const fg = colors.primaryForeground;
  return (
    <Card variant="elevated" style={[styles.card, { backgroundColor: colors.primary }]}>
      <View style={styles.labelRow}>
        <Feather name="zap" size={12} color={fg + "D9"} />
        <Small style={[styles.label, { color: fg + "D9" }]}>WEEKLY TIP</Small>
      </View>
      <View style={[styles.iconWrap, { backgroundColor: fg + "26" }]}>
        <Feather name={tip.iconName as never} size={20} color={fg} />
      </View>
      <H3 style={[styles.title, { color: fg }]}>{tip.title}</H3>
      <Body style={[styles.content, { color: fg + "E6" }]}>{tip.content}</Body>
      <View style={[styles.categoryPill, { backgroundColor: fg + "33" }]}>
        <Small style={[styles.category, { color: fg + "F2" }]}>{tip.category}</Small>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  label: { letterSpacing: 1 },
  iconWrap: {
    alignSelf: "flex-start",
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {},
  content: {},
  categoryPill: { alignSelf: "flex-start", paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill },
  category: {},
});
