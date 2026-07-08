import { router } from "expo-router";
import React from "react";
import { Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useAccessibility, type FontScale, type ThemeMode } from "@/context/AccessibilityContext";
import { useColors } from "@/hooks/useColors";

const FONT_SCALE_STEPS: { value: FontScale; label: string }[] = [
  { value: 1, label: "A" },
  { value: 1.15, label: "A+" },
  { value: 1.3, label: "A++" },
  { value: 1.5, label: "A+++" },
];

const THEME_MODE_STEPS: { value: ThemeMode; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export default function AccessibilityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, setThemeMode, setHighContrast, setFontScale, setReduceMotion, setReduceHaptics } = useAccessibility();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 40 }]}
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
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Accessibility</Text>
        <View style={{ width: 24 }} />
      </View>

      <View>
        <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Display</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.row}>
            <View style={{ flex: 1, gap: 10 }}>
              <Text style={[styles.rowLabel, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Theme</Text>
              <View style={styles.fontScaleRow}>
                {THEME_MODE_STEPS.map(step => {
                  const active = settings.themeMode === step.value;
                  return (
                    <TouchableOpacity
                      key={step.value}
                      onPress={() => setThemeMode(step.value)}
                      style={[
                        styles.fontScaleChip,
                        {
                          backgroundColor: active ? colors.primary : colors.muted,
                          borderColor: active ? colors.primary : colors.border,
                        },
                      ]}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel={`Theme ${step.label}`}
                      accessibilityState={{ selected: active }}
                    >
                      <Text
                        style={[
                          styles.fontScaleChipText,
                          { color: active ? colors.primaryForeground : colors.foreground, fontFamily: "Inter_700Bold" },
                        ]}
                      >
                        {step.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          <View style={[styles.row, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16 }]}>
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>High Contrast Colors</Text>
              <Text style={[styles.rowDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                Use stronger color contrast to make text and borders easier to see.
              </Text>
            </View>
            <Switch
              value={settings.highContrast}
              onValueChange={setHighContrast}
              trackColor={{ true: colors.primary, false: colors.muted }}
              accessibilityLabel="High contrast colors"
              accessibilityRole="switch"
              accessibilityState={{ checked: settings.highContrast }}
            />
          </View>

          <View style={[styles.row, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16 }]}>
            <View style={{ flex: 1, gap: 10 }}>
              <Text style={[styles.rowLabel, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Text Size</Text>
              <View style={styles.fontScaleRow}>
                {FONT_SCALE_STEPS.map(step => {
                  const active = settings.fontScale === step.value;
                  return (
                    <TouchableOpacity
                      key={step.value}
                      onPress={() => setFontScale(step.value)}
                      style={[
                        styles.fontScaleChip,
                        {
                          backgroundColor: active ? colors.primary : colors.muted,
                          borderColor: active ? colors.primary : colors.border,
                        },
                      ]}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel={`Text size ${step.label}`}
                      accessibilityState={{ selected: active }}
                    >
                      <Text
                        style={[
                          styles.fontScaleChipText,
                          { color: active ? colors.primaryForeground : colors.foreground, fontFamily: "Inter_700Bold" },
                        ]}
                      >
                        {step.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={[styles.previewBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Text
                  style={{
                    color: colors.foreground,
                    fontFamily: "Inter_400Regular",
                    fontSize: 15 * settings.fontScale,
                  }}
                >
                  Aa Sample text preview
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View>
        <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Motion & Haptics</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Reduce Motion</Text>
              <Text style={[styles.rowDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                Turn off screen transitions and animations.
              </Text>
            </View>
            <Switch
              value={settings.reduceMotion}
              onValueChange={setReduceMotion}
              trackColor={{ true: colors.primary, false: colors.muted }}
              accessibilityLabel="Reduce motion"
              accessibilityRole="switch"
              accessibilityState={{ checked: settings.reduceMotion }}
            />
          </View>

          <View style={[styles.row, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16 }]}>
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Reduce Haptics</Text>
              <Text style={[styles.rowDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                Turn off vibration feedback throughout the app.
              </Text>
            </View>
            <Switch
              value={settings.reduceHaptics}
              onValueChange={setReduceHaptics}
              trackColor={{ true: colors.primary, false: colors.muted }}
              accessibilityLabel="Reduce haptics"
              accessibilityRole="switch"
              accessibilityState={{ checked: settings.reduceHaptics }}
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 24 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { fontSize: 18 },
  sectionTitle: { fontSize: 18, marginBottom: 12 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowText: { flex: 1, gap: 4 },
  rowLabel: { fontSize: 15 },
  rowDesc: { fontSize: 13, lineHeight: 18 },
  fontScaleRow: { flexDirection: "row", gap: 8 },
  fontScaleChip: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  fontScaleChipText: { fontSize: 15 },
  previewBox: { borderRadius: 12, borderWidth: 1, padding: 14, alignItems: "center" },
});
