import React from "react";
import { StyleSheet, Switch, View } from "react-native";

import { AppText } from "@/components/AppText";
import { typeScale } from "@/constants/typography";
import { spacing } from "@/constants/spacing";
import { useColors } from "@/hooks/useColors";

interface ToggleRowProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export function ToggleRow({ label, description, value, onValueChange, disabled }: ToggleRowProps) {
  const colors = useColors();
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <AppText style={[typeScale.bodyStrong, { color: colors.foreground }]}>{label}</AppText>
        {description && (
          <AppText style={[typeScale.caption, { color: colors.mutedForeground, marginTop: 2 }]}>{description}</AppText>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.muted, true: colors.primary }}
        thumbColor={colors.card}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, paddingVertical: spacing.sm },
  text: { flex: 1 },
});
