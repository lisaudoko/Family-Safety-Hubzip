import React from "react";
import { StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { AppText } from "@/components/AppText";
import { fontFamily } from "@/constants/typography";
import { radius } from "@/constants/radius";
import { spacing } from "@/constants/spacing";
import { useColors } from "@/hooks/useColors";

export type BadgeVariant = "solid" | "soft" | "outline";

interface BadgeProps {
  label: string;
  tone?: string;
  variant?: BadgeVariant;
  icon?: keyof typeof Feather.glyphMap;
}

export function Badge({ label, tone, variant = "soft", icon }: BadgeProps) {
  const colors = useColors();
  const toneColor = tone ?? colors.primary;

  const bg = variant === "solid" ? toneColor : variant === "soft" ? toneColor + "22" : "transparent";
  const fg = variant === "solid" ? colors.primaryForeground : toneColor;
  const borderColor = variant === "outline" ? toneColor : undefined;

  return (
    <View style={[styles.pill, { backgroundColor: bg, borderWidth: borderColor ? 1 : 0, borderColor }]}>
      {icon && <Feather name={icon} size={10} color={fg} />}
      <AppText style={{ color: fg, fontSize: 11, fontFamily: fontFamily.semibold }}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
});
