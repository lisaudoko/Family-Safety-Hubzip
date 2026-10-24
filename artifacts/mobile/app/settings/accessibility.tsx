import { router } from "expo-router";
import React from "react";
import { Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useAccessibility, type FontScale, type ThemeMode } from "@/context/AccessibilityContext";
import { useColors } from "@/hooks/useColors";
import { Body, Card, H2, H3, SegmentedControl, ToggleRow } from "@/components/primitives";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/radius";

const FONT_SCALE_STEPS: { key: string; label: string; value: FontScale }[] = [
  { key: "1", label: "A", value: 1 },
  { key: "1.15", label: "A+", value: 1.15 },
  { key: "1.3", label: "A++", value: 1.3 },
  { key: "1.5", label: "A+++", value: 1.5 },
];

const THEME_MODE_STEPS: { key: ThemeMode; label: string }[] = [
  { key: "system", label: "System" },
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
];

export default function AccessibilityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, setThemeMode, setHighContrast, setFontScale, setReduceMotion, setReduceHaptics } = useAccessibility();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const fontScaleKey = String(settings.fontScale);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: topPad + spacing.lg, paddingBottom: insets.bottom + spacing.xxxl + 8 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Feather name="chevron-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <H2 style={{ marginBottom: 0 }}>Accessibility</H2>
        <View style={{ width: 24 }} />
      </View>

      <View>
        <H3 style={styles.sectionTitle}>Display</H3>
        <Card variant="elevated" style={styles.card}>
          <View style={{ gap: spacing.sm }}>
            <Body color={colors.foreground}>Theme</Body>
            <SegmentedControl segments={THEME_MODE_STEPS} value={settings.themeMode} onChange={setThemeMode} />
          </View>

          <View style={[styles.divider, { borderTopColor: colors.border }]}>
            <ToggleRow
              label="High Contrast Colors"
              description="Use stronger color contrast to make text and borders easier to see."
              value={settings.highContrast}
              onValueChange={setHighContrast}
            />
          </View>

          <View style={[styles.divider, { borderTopColor: colors.border, gap: spacing.sm }]}>
            <Body color={colors.foreground}>Text Size</Body>
            <SegmentedControl segments={FONT_SCALE_STEPS} value={fontScaleKey} onChange={(key) => setFontScale(Number(key) as FontScale)} />
            <View style={[styles.previewBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Body color={colors.foreground} style={{ fontSize: 15 * settings.fontScale, lineHeight: 22 * settings.fontScale }}>
                Aa Sample text preview
              </Body>
            </View>
          </View>
        </Card>
      </View>

      <View>
        <H3 style={styles.sectionTitle}>Motion & Haptics</H3>
        <Card variant="elevated" style={styles.card}>
          <ToggleRow
            label="Reduce Motion"
            description="Turn off screen transitions and animations."
            value={settings.reduceMotion}
            onValueChange={setReduceMotion}
          />
          <View style={[styles.divider, { borderTopColor: colors.border }]}>
            <ToggleRow
              label="Reduce Haptics"
              description="Turn off vibration feedback throughout the app."
              value={settings.reduceHaptics}
              onValueChange={setReduceHaptics}
            />
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl, gap: spacing.xxl },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { marginBottom: spacing.md },
  card: { gap: spacing.lg },
  divider: { borderTopWidth: 1, paddingTop: spacing.lg },
  previewBox: { borderRadius: radius.md, borderWidth: 1, padding: spacing.md, alignItems: "center" },
});
