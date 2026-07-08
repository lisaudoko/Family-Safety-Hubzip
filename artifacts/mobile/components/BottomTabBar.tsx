import { Href, router } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { AppText as Text } from "@/components/AppText";

type TabKey = "index" | "learn" | "coach" | "family" | "profile";

const TABS: { key: TabKey; label: string; icon: keyof typeof Feather.glyphMap; href: Href }[] = [
  { key: "index", label: "Home", icon: "home", href: "/(tabs)" },
  { key: "learn", label: "Learn", icon: "book-open", href: "/(tabs)/learn" },
  { key: "coach", label: "Coach", icon: "message-circle", href: "/(tabs)/coach" },
  { key: "family", label: "Family", icon: "users", href: "/(tabs)/family" },
  { key: "profile", label: "Profile", icon: "user", href: "/(tabs)/profile" },
];

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
          paddingBottom: Math.max(insets.bottom, 8),
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
            <Feather name={tab.icon} size={22} color={color} />
            <Text
              style={[
                styles.label,
                { color, fontFamily: isActive ? "Inter_600SemiBold" : "Inter_400Regular" },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", borderTopWidth: 1, paddingTop: 8 },
  item: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3 },
  label: { fontSize: 11 },
});
