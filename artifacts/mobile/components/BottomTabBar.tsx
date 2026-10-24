import { router } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { Small } from "@/components/primitives";
import { spacing } from "@/constants/spacing";
import { fontFamily } from "@/constants/typography";
import { TABS, type TabKey } from "@/constants/tabs";

export function BottomTabBar({ active }: { active?: TabKey }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, spacing.sm),
        },
      ]}
    >
      {TABS.map(tab => {
        const isActive = active === tab.key;
        const color = isActive ? colors.primary : colors.mutedForeground;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.item}
            onPress={() => router.navigate(tab.href)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={tab.label}
          >
            <Feather name={tab.featherIcon} size={22} color={color} />
            <Small style={{ color, fontFamily: isActive ? fontFamily.semibold : fontFamily.regular }}>{tab.label}</Small>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", borderTopWidth: 1, paddingTop: spacing.sm },
  item: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3 },
});
