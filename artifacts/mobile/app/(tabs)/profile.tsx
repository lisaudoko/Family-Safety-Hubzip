import { router } from "expo-router";
import React from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useFamily } from "@/context/FamilyContext";
import { BADGES } from "@/data/seed";
import { useColors } from "@/hooks/useColors";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { progress } = useFamily();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const earnedBadges = BADGES.filter(b => progress.earnedBadges.includes(b.id));
  const unearnedBadges = BADGES.filter(b => !progress.earnedBadges.includes(b.id));

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: async () => { await logout(); router.replace("/welcome"); } },
    ]);
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: bottomPad + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.avatarLetter, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>{user?.name?.[0]?.toUpperCase() ?? "P"}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{user?.name ?? "Parent"}</Text>
          <Text style={[styles.profileEmail, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{user?.email}</Text>
          <View style={[styles.planBadge, { backgroundColor: user?.isPremium ? colors.accent + "22" : colors.secondary }]}>
            <Feather name={user?.isPremium ? "star" : "user"} size={12} color={user?.isPremium ? colors.accent : colors.mutedForeground} />
            <Text style={[styles.planText, { color: user?.isPremium ? colors.accent : colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
              {user?.isPremium ? "Premium" : "Free Plan"}
            </Text>
          </View>
        </View>
      </View>

      {!user?.isPremium && (
        <TouchableOpacity style={[styles.upgradeCard, { backgroundColor: colors.accent }]} onPress={() => router.push("/subscription")} activeOpacity={0.85}>
          <View style={styles.upgradeContent}>
            <Feather name="star" size={20} color="#FFFFFF" />
            <View>
              <Text style={[styles.upgradeTitle, { fontFamily: "Inter_700Bold" }]}>Unlock Premium</Text>
              <Text style={[styles.upgradeDesc, { fontFamily: "Inter_400Regular" }]}>All courses, advanced challenges & more</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      <View>
        <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Your Badges</Text>
        {earnedBadges.length === 0 ? (
          <View style={[styles.emptyBadges, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="award" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyBadgesText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Complete courses and challenges to earn badges</Text>
          </View>
        ) : (
          <View style={styles.badgesGrid}>
            {earnedBadges.map(badge => (
              <View key={badge.id} style={[styles.badge, { backgroundColor: badge.color + "18", borderColor: badge.color + "33" }]}>
                <Feather name={badge.iconName as never} size={22} color={badge.color} />
                <Text style={[styles.badgeName, { color: badge.color, fontFamily: "Inter_600SemiBold" }]}>{badge.title}</Text>
                <Text style={[styles.badgeDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{badge.description}</Text>
              </View>
            ))}
          </View>
        )}
        {unearnedBadges.length > 0 && (
          <View style={styles.lockedBadgesRow}>
            {unearnedBadges.slice(0, 4).map(badge => (
              <View key={badge.id} style={[styles.lockedBadge, { backgroundColor: colors.muted }]}>
                <Feather name="lock" size={14} color={colors.mutedForeground} />
              </View>
            ))}
            {unearnedBadges.length > 4 && (
              <View style={[styles.lockedBadge, { backgroundColor: colors.muted }]}>
                <Text style={[styles.lockedMore, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>+{unearnedBadges.length - 4}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      <View>
        <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Settings</Text>
        <View style={[styles.settingsList, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { icon: "user" as const, label: "Edit Profile", onPress: () => {} },
            { icon: "bell" as const, label: "Notifications", onPress: () => {} },
            { icon: "shield" as const, label: "Privacy Policy", onPress: () => {} },
            { icon: "help-circle" as const, label: "Help & Support", onPress: () => {} },
          ].map((item, idx, arr) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.settingsRow, idx < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <Feather name={item.icon} size={18} color={colors.foreground} />
              <Text style={[styles.settingsLabel, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>{item.label}</Text>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={[styles.logoutBtn, { borderColor: colors.destructive + "44" }]} onPress={handleLogout} activeOpacity={0.8}>
        <Feather name="log-out" size={18} color={colors.destructive} />
        <Text style={[styles.logoutText, { color: colors.destructive, fontFamily: "Inter_500Medium" }]}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={[styles.version, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Digital Village v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 24 },
  profileCard: { flexDirection: "row", gap: 14, padding: 16, borderRadius: 16, borderWidth: 1, alignItems: "center" },
  avatar: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  avatarLetter: { fontSize: 26 },
  profileInfo: { flex: 1, gap: 5 },
  profileName: { fontSize: 18 },
  profileEmail: { fontSize: 13 },
  planBadge: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  planText: { fontSize: 12 },
  upgradeCard: { borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  upgradeContent: { flexDirection: "row", alignItems: "center", gap: 12 },
  upgradeTitle: { color: "#FFFFFF", fontSize: 16 },
  upgradeDesc: { color: "rgba(255,255,255,0.8)", fontSize: 13 },
  sectionTitle: { fontSize: 18, marginBottom: 12 },
  emptyBadges: { borderRadius: 14, borderWidth: 1, padding: 24, alignItems: "center", gap: 10 },
  emptyBadgesText: { fontSize: 13, textAlign: "center" },
  badgesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  badge: { width: "47%", borderRadius: 14, borderWidth: 1, padding: 14, gap: 6, alignItems: "center" },
  badgeName: { fontSize: 13, textAlign: "center" },
  badgeDesc: { fontSize: 11, textAlign: "center", lineHeight: 15 },
  lockedBadgesRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  lockedBadge: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  lockedMore: { fontSize: 12 },
  settingsList: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  settingsRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 15, gap: 12 },
  settingsLabel: { flex: 1, fontSize: 15 },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 14, borderWidth: 1, paddingVertical: 14 },
  logoutText: { fontSize: 15 },
  version: { textAlign: "center", fontSize: 12, paddingBottom: 4 },
});
