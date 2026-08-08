import React from "react";
import { StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { Child } from "@/context/FamilyContext";
import { useColors } from "@/hooks/useColors";
import { AGE_BAND_COLORS, avatarColorForName } from "@/constants/identityColors";
import { Avatar, Badge, Body, Card } from "@/components/primitives";
import { spacing } from "@/constants/spacing";

interface Props {
  child: Child;
  onPress: () => void;
}

export default function ChildCard({ child, onPress }: Props) {
  const colors = useColors();
  const avatarColor = avatarColorForName(child.name);
  const ageBandColor = AGE_BAND_COLORS[child.ageBand] ?? colors.primary;

  return (
    <Card variant="outline" pressable onPress={onPress} style={styles.card}>
      <Avatar initial={child.name[0] ?? "?"} color={avatarColor} size={46} />
      <View style={styles.info}>
        <Body color={colors.foreground}>{child.name}</Body>
        <Badge label={`Ages ${child.ageBand}`} tone={ageBandColor} variant="soft" />
      </View>
      <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  info: { flex: 1, gap: spacing.xs },
});
