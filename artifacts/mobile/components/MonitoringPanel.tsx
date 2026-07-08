import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useHaptics } from "@/lib/haptics";
import {
  apiGetDashboardOverview,
  apiSendWeeklyDigest,
  type ApiDashboardChild,
} from "@/lib/apiClient";

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
    <View style={{ gap: 12 }}>
      {loading && (
        <View style={[styles.stateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.stateText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Loading monitoring data...
          </Text>
        </View>
      )}

      {!loading && error && (
        <View style={[styles.stateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="alert-triangle" size={20} color={colors.destructive} />
          <Text style={[styles.stateText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{error}</Text>
          <TouchableOpacity onPress={load}>
            <Text style={[styles.retryText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && children && children.length === 0 && (
        <View style={[styles.stateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="smartphone" size={20} color={colors.mutedForeground} />
          <Text style={[styles.stateText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Add a child to start monitoring their devices.
          </Text>
        </View>
      )}

      {!loading && !error && children && children.length > 0 && (
        <>
          {children.every((c) => c.devices.length === 0) && (
            <View style={[styles.stateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="smartphone" size={20} color={colors.mutedForeground} />
              <Text style={[styles.stateText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                No devices registered yet. Once a child's device is set up, activity will show up here.
              </Text>
            </View>
          )}

          {children.map((child) => {
            const staleCount = child.devices.filter((d) => d.isStale).length;
            return (
              <View key={child.id} style={[styles.childCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.childHeader}>
                  <Text style={[styles.childName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{child.name}</Text>
                  {staleCount > 0 && (
                    <View style={[styles.staleBadge, { backgroundColor: colors.destructive + "18" }]}>
                      <Text style={[styles.staleBadgeText, { color: colors.destructive, fontFamily: "Inter_600SemiBold" }]}>
                        {staleCount} stale
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.metaRow}>
                  <Feather name="smartphone" size={13} color={colors.mutedForeground} />
                  <Text style={[styles.metaText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                    {child.devices.length} device{child.devices.length === 1 ? "" : "s"}
                  </Text>
                </View>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Feather name="clock" size={14} color={colors.primary} />
                    <Text style={[styles.statValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                      {formatDuration(child.recentActivity.screenTimeSeconds)}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>screen time (7d)</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Feather name="activity" size={14} color={colors.primary} />
                    <Text style={[styles.statValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                      {child.recentActivity.activityCount}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>activity events (7d)</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </>
      )}

      <TouchableOpacity
        style={[styles.digestBtn, { backgroundColor: colors.secondary, borderColor: colors.primary + "33" }]}
        onPress={handleSendDigest}
        disabled={sendingDigest}
        activeOpacity={0.85}
      >
        {sendingDigest ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Feather name="mail" size={18} color={colors.primary} />
        )}
        <Text style={[styles.digestBtnText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
          {sendingDigest ? "Sending..." : "Send weekly digest to my email"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  stateCard: { alignItems: "center", gap: 8, padding: 20, borderRadius: 16, borderWidth: 1 },
  stateText: { fontSize: 13, textAlign: "center", lineHeight: 18 },
  retryText: { fontSize: 13, marginTop: 4 },
  childCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  childHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  childName: { fontSize: 16 },
  staleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  staleBadgeText: { fontSize: 11 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 12 },
  statsRow: { flexDirection: "row", gap: 20 },
  statItem: { flex: 1, gap: 2 },
  statValue: { fontSize: 16, marginTop: 2 },
  statLabel: { fontSize: 11 },
  digestBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 14, borderWidth: 1, paddingVertical: 14 },
  digestBtnText: { fontSize: 14 },
});
