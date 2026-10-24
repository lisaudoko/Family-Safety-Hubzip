import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useFamilyPolicy } from "@/hooks/useFamilyPolicy";
import { Badge, Body, Button, Card, Caption, H2, TextField, ToggleRow } from "@/components/primitives";
import { spacing } from "@/constants/spacing";

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export default function FamilyPolicyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { policy, loading, updatePolicy } = useFamilyPolicy();

  const [limitInput, setLimitInput] = useState("");
  const [bedtimeStart, setBedtimeStart] = useState("");
  const [bedtimeEnd, setBedtimeEnd] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    setLimitInput(policy?.screenTimeLimitMinutes ? String(policy.screenTimeLimitMinutes) : "");
    setBedtimeStart(policy?.bedtimeStart ?? "");
    setBedtimeEnd(policy?.bedtimeEnd ?? "");
  }, [policy]);

  const applyChange = async (key: string, data: Partial<NonNullable<typeof policy>>) => {
    setSaving(key);
    try {
      await updatePolicy(data);
    } catch (e: any) {
      console.error("[family-policy] failed to save", key, e?.message || e);
      Alert.alert("Error", "Failed to save this default. Please check your connection and try again.");
    } finally {
      setSaving(null);
    }
  };

  const saveLimit = () => {
    const trimmed = limitInput.trim();
    if (!trimmed) {
      applyChange("screenTimeLimitMinutes", { screenTimeLimitMinutes: null });
      return;
    }
    const minutes = parseInt(trimmed, 10);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      Alert.alert("Invalid Limit", "Enter a whole number of minutes greater than 0.");
      return;
    }
    applyChange("screenTimeLimitMinutes", { screenTimeLimitMinutes: minutes });
  };

  const saveBedtime = () => {
    if (!TIME_PATTERN.test(bedtimeStart) || !TIME_PATTERN.test(bedtimeEnd)) {
      Alert.alert("Invalid Time", "Enter times in 24-hour HH:MM format, e.g. 21:00.");
      return;
    }
    applyChange("bedtime", { bedtimeStart, bedtimeEnd });
  };

  const clearBedtime = () => {
    setBedtimeStart("");
    setBedtimeEnd("");
    applyChange("bedtime", { bedtimeStart: null, bedtimeEnd: null });
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: topPad + spacing.lg, paddingBottom: insets.bottom + spacing.xxxl }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Go back">
          <Feather name="chevron-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <H2 style={{ marginBottom: 0 }}>Family Defaults</H2>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.introRow}>
        <Body color={colors.mutedForeground} style={styles.introText}>
          These apply to every child unless overridden by a child-specific or device-specific setting.
        </Body>
        <Badge label="Defined, not yet enforced on-device" tone={colors.warning} variant="soft" />
      </View>

      <Card variant="elevated" style={styles.card}>
        <TextField
          label="Screen Time Limit (minutes/day)"
          placeholder="No limit"
          value={limitInput}
          onChangeText={setLimitInput}
          onBlur={saveLimit}
          keyboardType="number-pad"
        />

        <View style={styles.bedtimeRow}>
          <TextField containerStyle={{ flex: 1 }} label="Bedtime start" placeholder="21:00" value={bedtimeStart} onChangeText={setBedtimeStart} />
          <TextField containerStyle={{ flex: 1 }} label="Bedtime end" placeholder="07:00" value={bedtimeEnd} onChangeText={setBedtimeEnd} />
        </View>
        <View style={styles.bedtimeActions}>
          <Button title="Save Bedtime" size="sm" onPress={saveBedtime} loading={saving === "bedtime"} disabled={saving === "bedtime"} style={{ flex: 1 }} />
          <Button title="Clear" size="sm" variant="outline" onPress={clearBedtime} disabled={saving === "bedtime"} fullWidth={false} />
        </View>
      </Card>

      <Card variant="elevated" style={styles.card}>
        <ToggleRow
          label="Block Search Engines"
          value={policy?.blockSafari ?? false}
          onValueChange={(v) => applyChange("blockSafari", { blockSafari: v })}
          disabled={saving === "blockSafari"}
        />
        <ToggleRow
          label="Require Parent Approval"
          value={policy?.requireParentApproval ?? false}
          onValueChange={(v) => applyChange("requireParentApproval", { requireParentApproval: v })}
          disabled={saving === "requireParentApproval"}
        />
        <ToggleRow
          label="Block New App Installs"
          value={policy?.blockNewAppInstalls ?? false}
          onValueChange={(v) => applyChange("blockNewAppInstalls", { blockNewAppInstalls: v })}
          disabled={saving === "blockNewAppInstalls"}
        />
        <ToggleRow
          label="Block Explicit Content"
          value={policy?.blockExplicitContent ?? false}
          onValueChange={(v) => applyChange("blockExplicitContent", { blockExplicitContent: v })}
          disabled={saving === "blockExplicitContent"}
        />
      </Card>

      {loading && <Caption color={colors.mutedForeground} style={{ textAlign: "center" }}>Loading...</Caption>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl, gap: spacing.xl },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  introRow: { gap: spacing.sm },
  introText: {},
  card: { gap: spacing.lg },
  bedtimeRow: { flexDirection: "row", gap: spacing.md },
  bedtimeActions: { flexDirection: "row", gap: spacing.sm },
});
