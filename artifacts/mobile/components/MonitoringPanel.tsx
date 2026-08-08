import React, { useCallback, useState } from "react";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { useHaptics } from "@/lib/haptics";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import { deviceStatusMeta } from "@/lib/deviceStatus";
import { apiGetDashboardOverview, apiSendWeeklyDigest, type ApiDashboardChild } from "@/lib/apiClient";
import { Badge, Body, Card, Caption, H3, LoadingSpinner, Small } from "@/components/primitives";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/radius";

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0m";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

export function MonitoringPanel() {
  const colors = useColors();
  const haptics = useHaptics();
  const [children, setChildren] = useState<ApiDashboardChild[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingDigest, setSendingDigest] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { children: kids } = await apiGetDashboardOverview();
      setChildren(kids);
    } catch (e: any) {
      console.error("[monitoring] load error:", e?.message || e);
      setError("Couldn't load monitoring data. Pull to refresh or try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleSendDigest = async () => {
    setSendingDigest(true);
    try {
      const result = await apiSendWeeklyDigest();
      await haptics.notify(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Digest Sent", `A weekly digest was sent to ${result.to}.`);
    } catch (e: any) {
      console.error("[monitoring] send digest error:", e?.message || e);
      await haptics.notify(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Couldn't Send Digest", e?.message || "Please try again later.");
    } finally {
      setSendingDigest(false);
    }
  };

  return (
    <View style={{ gap: spacing.md }}>
      {loading && (
        <Card variant="outline" style={styles.stateCard}>
          <LoadingSpinner size="small" />
          <Body color={colors.mutedForeground} style={styles.stateText}>Loading monitoring data...</Body>
        </Card>
      )}

      {!loading && error && (
        <Card variant="outline" style={styles.stateCard}>
          <Feather name="alert-triangle" size={20} color={colors.destructive} />
          <Body color={colors.mutedForeground} style={styles.stateText}>{error}</Body>
          <TouchableOpacity onPress={load}>
            <Body color={colors.primary} style={{ fontSize: 13 }}>Retry</Body>
          </TouchableOpacity>
        </Card>
      )}

      {!loading && !error && children && children.length === 0 && (
        <Card variant="outline" style={styles.stateCard}>
          <Feather name="smartphone" size={20} color={colors.mutedForeground} />
          <Body color={colors.mutedForeground} style={styles.stateText}>Add a child to start monitoring their devices.</Body>
        </Card>
      )}

      {!loading && !error && children && children.length > 0 && (
        <>
          {children.every((c) => c.devices.length === 0) && (
            <Card variant="outline" style={styles.stateCard}>
              <Feather name="smartphone" size={20} color={colors.mutedForeground} />
              <Body color={colors.mutedForeground} style={styles.stateText}>
                No devices registered yet. Once a child's device is set up, activity will show up here.
              </Body>
            </Card>
          )}

          {children.map((child) => (
            <Card key={child.id} variant="elevated" style={styles.childCard}>
              <H3>{child.name}</H3>

              {child.devices.length > 0 && (
                <View style={styles.deviceList}>
                  {child.devices.map((device) => {
                    const meta = deviceStatusMeta(device);
                    return (
                      <View key={device.id} style={styles.deviceRow}>
                        <Feather name="smartphone" size={13} color={colors.mutedForeground} />
                        <Body color={colors.foreground} style={styles.deviceName} numberOfLines={1}>{device.name}</Body>
                        <Badge label={meta.label} tone={colors[meta.tone]} variant="soft" />
                        <Caption color={colors.mutedForeground}>{formatRelativeTime(device.lastSyncedAt)}</Caption>
                      </View>
                    );
                  })}
                </View>
              )}

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Feather name="clock" size={14} color={colors.primary} />
                  <Body color={colors.foreground} style={styles.statValue}>{formatDuration(child.recentActivity.screenTimeSeconds)}</Body>
                  <Small color={colors.mutedForeground}>screen time (7d)</Small>
                </View>
                <View style={styles.statItem}>
                  <Feather name="activity" size={14} color={colors.primary} />
                  <Body color={colors.foreground} style={styles.statValue}>{child.recentActivity.activityCount}</Body>
                  <Small color={colors.mutedForeground}>activity events (7d)</Small>
                </View>
              </View>
            </Card>
          ))}
        </>
      )}

      <TouchableOpacity
        style={[styles.digestBtn, { backgroundColor: colors.secondary, borderColor: colors.primary + "33" }]}
        onPress={handleSendDigest}
        disabled={sendingDigest}
        activeOpacity={0.85}
      >
        {sendingDigest ? <LoadingSpinner size="small" /> : <Feather name="mail" size={18} color={colors.primary} />}
        <Body color={colors.primary} style={{ fontSize: 14 }}>{sendingDigest ? "Sending..." : "Send weekly digest to my email"}</Body>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  stateCard: { alignItems: "center", gap: spacing.sm },
  stateText: { textAlign: "center" },
  childCard: { gap: spacing.md },
  deviceList: { gap: spacing.sm },
  deviceRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  deviceName: { flex: 1 },
  statsRow: { flexDirection: "row", gap: spacing.xl },
  statItem: { flex: 1, gap: 2 },
  statValue: { marginTop: 2 },
  digestBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: spacing.md,
  },
});
