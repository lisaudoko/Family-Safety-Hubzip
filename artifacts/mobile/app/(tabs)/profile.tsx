import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { Alert, Linking, Modal, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import { useFamily } from "@/context/FamilyContext";
import { useCurriculum } from "@/hooks/useCurriculum";
import { useColors } from "@/hooks/useColors";
import { useHaptics } from "@/lib/haptics";
import { AppText as Text } from "@/components/AppText";
import { apiCreateSupportCode, apiResendVerification, apiVerifyEmail } from "@/lib/apiClient";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout, updateProfile, canReturnToParent, returnToParent, manageSubscription, refreshUser } = useAuth();
  const [managingSubscription, setManagingSubscription] = useState(false);
  const [verifyModal, setVerifyModal] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const haptics = useHaptics();
  const { progress } = useFamily();
  const { badges: BADGES } = useCurriculum();
  const [editModal, setEditModal] = useState(false);
  const [editName, setEditName] = useState(user?.name ?? "");
  const [supportModal, setSupportModal] = useState(false);
  const [supportCode, setSupportCode] = useState<string | null>(null);
  const [supportExpiresAt, setSupportExpiresAt] = useState<string | null>(null);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportError, setSupportError] = useState<string | null>(null);
  const [supportSecondsLeft, setSupportSecondsLeft] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({
        y: 0,
        animated: false,
      });
    }, [])
  );
  const isParent = user?.role === "parent";
  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({
        y: 0,
        animated: false,
      });
    }, [])
  );

  
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const earnedBadges = BADGES.filter(b => progress.earnedBadges.includes(b.id));
  const unearnedBadges = BADGES.filter(b => !progress.earnedBadges.includes(b.id));

  const performLogout = async () => {
    await logout();
    router.replace("/welcome");
  };

  const handleResendVerification = async () => {
    try {
      setResendLoading(true);
      await apiResendVerification();
      Alert.alert("Code Sent", "Check your email for a new verification code.");
      setVerifyModal(true);
    } catch (err: any) {
      Alert.alert("Couldn't Send Code", err?.message || "Please try again in a bit.");
    } finally {
      setResendLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!verifyCode.trim()) {
      Alert.alert("Missing Code", "Please enter the verification code from your email.");
      return;
    }
    try {
      setVerifyLoading(true);
      await apiVerifyEmail(verifyCode.trim());
      await haptics.notify(Haptics.NotificationFeedbackType.Success);
      setVerifyModal(false);
      setVerifyCode("");
      await refreshUser();
      Alert.alert("Email Verified", "Your email address has been verified.");
    } catch (err: any) {
      Alert.alert("Verification Failed", err?.message || "Invalid or expired code. Please try again.");
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleLogout = () => {
    // react-native-web's Alert.alert() is a no-op, so the native confirm
    // dialog never appears there — fall back to window.confirm on web.
    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to sign out?")) {
        performLogout();
      }
      return;
    }
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: performLogout },
    ]);
  };

  const handleNotifications = () => {
    Alert.alert(
      "Notifications",
      "Push notifications will be available in a future update. You'll get weekly tips and progress reminders.",
      [{ text: "Got it" }]
    );
  };

  const handlePrivacyPolicy = () => {
    Alert.alert(
      "Our Privacy Commitment",
      "Digital Village does not monitor, track, or surveil children's devices. We do not sell or share your data. All family data stays with you.\n\nWe believe digital safety is built through education and trust — never surveillance.",
      [{ text: "Close" }]
    );
  };

  const handleHelp = () => {
    Alert.alert(
      "Help & Support",
      "Need help? Reach out at:\n\nhello@digitalvillage.app\n\nWe respond within 1 business day.",
      [
        { text: "Send Email", onPress: () => Linking.openURL("mailto:hello@digitalvillage.app") },
        { text: "Close", style: "cancel" },
      ]
    );
  };

  const handleGetSupport = () => {
    setSupportModal(true);
    setSupportCode(null);
    setSupportError(null);
  };

  const requestSupportCode = async () => {
    setSupportLoading(true);
    setSupportError(null);
    try {
      const res = await apiCreateSupportCode();
      setSupportCode(res.code);
      setSupportExpiresAt(res.expiresAt);
    } catch (err) {
      setSupportError(err instanceof Error ? err.message : "Failed to generate a code. Try again.");
    } finally {
      setSupportLoading(false);
    }
  };

  React.useEffect(() => {
    if (!supportExpiresAt) return;
    const tick = () => {
      const secondsLeft = Math.max(0, Math.round((new Date(supportExpiresAt).getTime() - Date.now()) / 1000));
      setSupportSecondsLeft(secondsLeft);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [supportExpiresAt]);

  const completedCourses = Object.values(progress.courseProgress).filter(p => p === 100).length;
  const completedLessons = progress.completedLessons.length;

  return (
    <ScrollView
      ref={scrollRef}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: bottomPad + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.avatarLetter, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
            {user?.name?.[0]?.toUpperCase() ?? "P"}
          </Text>
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

      {user?.role === "parent" && user?.emailVerified === false && (
        <View style={[styles.upgradeCard, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginTop: 12 }]}>
          <View style={styles.upgradeContent}>
            <Feather name="mail" size={20} color={colors.primary} />
            <View>
              <Text style={[styles.upgradeTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Verify your email</Text>
              <Text style={[styles.upgradeDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                We sent you a code when you signed up.
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => setVerifyModal(true)} activeOpacity={0.8}>
            <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>Enter code</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.statsRow}>
        {[
          { label: "Courses Done", value: completedCourses, icon: "book-open" as const },
          { label: "Lessons Done", value: completedLessons, icon: "check-circle" as const },
          { label: "Badges Earned", value: earnedBadges.length, icon: "award" as const },
        ].map(s => (
          <View key={s.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name={s.icon} size={16} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{s.label}</Text>
          </View>
        ))}
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

      {user?.isPremium && (
        <TouchableOpacity
          style={[styles.upgradeCard, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
          disabled={managingSubscription}
          activeOpacity={0.85}
          onPress={async () => {
            try {
              setManagingSubscription(true);
              await manageSubscription();
            } catch {
              Alert.alert("Error", "Couldn't open subscription management. Please try again.");
            } finally {
              setManagingSubscription(false);
            }
          }}
        >
          <View style={styles.upgradeContent}>
            <Feather name="credit-card" size={20} color={colors.foreground} />
            <View>
              <Text style={[styles.upgradeTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                {managingSubscription ? "Opening..." : "Manage Subscription"}
              </Text>
              <Text style={[styles.upgradeDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Update payment, change plan, or cancel</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      )}

      <View>
        <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Your Badges</Text>
        {earnedBadges.length === 0 ? (
          <View style={[styles.emptyBadges, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="award" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyBadgesText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Complete courses and challenges to earn badges
            </Text>
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
            <Text style={[styles.lockedLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {unearnedBadges.length} more to unlock
            </Text>
            {unearnedBadges.slice(0, 5).map(badge => (
              <View key={badge.id} style={[styles.lockedBadge, { backgroundColor: colors.muted }]}>
                <Feather name="lock" size={14} color={colors.mutedForeground} />
              </View>
            ))}
          </View>
        )}
      </View>
      <View>
        <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Settings</Text>
        <View style={[styles.settingsList, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { icon: "user" as const, label: "Edit Profile", onPress: () => { setEditName(user?.name ?? ""); setEditModal(true); } },
            { icon: "eye" as const, label: "Accessibility", onPress: () => router.push("/settings/accessibility") },
            { icon: "bell" as const, label: "Notifications", onPress: handleNotifications },
            { icon: "shield" as const, label: "Privacy Policy", onPress: handlePrivacyPolicy },
            { icon: "help-circle" as const, label: "Help & Support", onPress: handleHelp },
            ...(isParent ? [{ icon: "key" as const, label: "Get Support Access Code", onPress: handleGetSupport }] : []),
          ].map((item, idx, arr) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.settingsRow, idx < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
              onPress={item.onPress}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <Feather name={item.icon} size={18} color={colors.foreground} />
              <Text style={[styles.settingsLabel, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>{item.label}</Text>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View>
        <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Privacy & Safety</Text>
        {[
          { icon: "shield" as const, title: "Our Approach", desc: "Digital Village does not monitor, track, or spy on children's devices. We build safety through education and conversation.", color: colors.success },
          { icon: "eye-off" as const, title: "No Surveillance", desc: "No iMessage reading, no keystroke logging, no unauthorized photo access, no background recording.", color: colors.info },
          { icon: "lock" as const, title: "Data Privacy", desc: "All family data stays on your device. We don't sell or share your information.", color: colors.accent },
        ].map(item => (
          <View key={item.title} style={[styles.privacyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.privacyIcon, { backgroundColor: item.color + "22" }]}>
              <Feather name={item.icon} size={18} color={item.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.privacyTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{item.title}</Text>
              <Text style={[styles.privacyDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{item.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {canReturnToParent && (
        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: colors.primary + "44" }]}
          onPress={async () => {
            await returnToParent();
            await haptics.notify(Haptics.NotificationFeedbackType.Success);
          }}
          activeOpacity={0.8}
        >
          <Feather name="corner-up-left" size={18} color={colors.primary} />
          <Text style={[styles.logoutText, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>Switch Back to Parent</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={[styles.logoutBtn, { borderColor: colors.destructive + "44" }]} onPress={handleLogout} activeOpacity={0.8}>
        <Feather name="log-out" size={18} color={colors.destructive} />
        <Text style={[styles.logoutText, { color: colors.destructive, fontFamily: "Inter_500Medium" }]}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={[styles.version, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Digital Village v1.0.0</Text>

      <Modal visible={editModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditModal(false)}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Edit Profile</Text>
            <View style={{ width: 22 }} />
          </View>
          <View style={styles.modalBody}>
            <Text style={[styles.label, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Display Name</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, fontFamily: "Inter_400Regular" }]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Your name"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="words"
              autoFocus
            />
            <Text style={[styles.modalNote, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Name changes update your display only. Your email cannot be changed here.
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.modalSaveBtn, { backgroundColor: editName.trim() ? colors.primary : colors.muted }]}
            disabled={!editName.trim()}
            onPress={async () => {
              const trimmed = editName.trim();
              if (!trimmed) return;
              try {
                await updateProfile({ name: trimmed });
              } catch {
                // ignore
              }
              await haptics.notify(Haptics.NotificationFeedbackType.Success);
              setEditModal(false);
              Alert.alert("Profile Updated", "Your name has been saved.");
            }}
            activeOpacity={0.85}
          >
            <Text style={[styles.modalSaveBtnText, { fontFamily: "Inter_700Bold" }]}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal visible={verifyModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setVerifyModal(false)}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setVerifyModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Verify Email</Text>
            <View style={{ width: 22 }} />
          </View>
          <View style={styles.modalBody}>
            <Text style={[styles.label, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Verification Code</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, fontFamily: "Inter_400Regular" }]}
              value={verifyCode}
              onChangeText={setVerifyCode}
              placeholder="6-digit code"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
            <Text style={[styles.modalNote, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Check your email ({user?.email}) for the code we sent when you signed up.
            </Text>
            <TouchableOpacity onPress={handleResendVerification} disabled={resendLoading} style={{ paddingTop: 4 }}>
              <Text style={{ color: colors.primary, fontFamily: "Inter_500Medium", fontSize: 14 }}>
                {resendLoading ? "Sending…" : "Resend code"}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.modalSaveBtn, { backgroundColor: verifyLoading ? colors.muted : colors.primary }]}
            disabled={verifyLoading || !verifyCode.trim()}
            onPress={handleVerifyEmail}
            activeOpacity={0.85}
          >
            <Text style={[styles.modalSaveBtnText, { fontFamily: "Inter_700Bold" }]}>
              {verifyLoading ? "Verifying…" : "Verify Email"}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal visible={supportModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSupportModal(false)}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSupportModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Support Access Code</Text>
            <View style={{ width: 22 }} />
          </View>
          <View style={styles.modalBody}>
            <Text style={[styles.modalNote, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              If Digital Village support asked you to generate a code to help fix an issue with your account, tap below. The code lets our team into your family's data for a limited time only — every action they take is logged and visible to you.
            </Text>

            {supportCode ? (
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, paddingVertical: 24, marginTop: 8 }]}>
                <Text style={[styles.statValue, { color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 32, letterSpacing: 4 }]}>
                  {supportCode}
                </Text>
                <Text style={[styles.statLabel, { color: supportSecondsLeft > 0 ? colors.mutedForeground : colors.destructive, fontFamily: "Inter_400Regular" }]}>
                  {supportSecondsLeft > 0
                    ? `Expires in ${Math.floor(supportSecondsLeft / 60)}:${String(supportSecondsLeft % 60).padStart(2, "0")}`
                    : "Expired — generate a new code"}
                </Text>
              </View>
            ) : null}

            {supportError ? (
              <Text style={[styles.modalNote, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>{supportError}</Text>
            ) : null}
          </View>
          <TouchableOpacity
            style={[styles.modalSaveBtn, { backgroundColor: colors.primary, opacity: supportLoading ? 0.7 : 1 }]}
            disabled={supportLoading}
            onPress={requestSupportCode}
            activeOpacity={0.85}
          >
            <Text style={[styles.modalSaveBtnText, { fontFamily: "Inter_700Bold" }]}>
              {supportLoading ? "Generating…" : supportCode ? "Generate New Code" : "Generate Code"}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
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
  statsRow: { flexDirection: "row", gap: 8 },
  statCard: { flex: 1, alignItems: "center", padding: 12, borderRadius: 14, borderWidth: 1, gap: 4 },
  statValue: { fontSize: 22 },
  statLabel: { fontSize: 11, textAlign: "center" },
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
  lockedBadgesRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  lockedLabel: { fontSize: 12, flex: 1 },
  lockedBadge: { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  settingsList: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  settingsRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 15, gap: 12 },
  settingsLabel: { flex: 1, fontSize: 15 },
  privacyCard: { flexDirection: "row", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8, alignItems: "flex-start" },
  privacyIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  privacyTitle: { fontSize: 14, marginBottom: 2 },
  privacyDesc: { fontSize: 13, lineHeight: 18 },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 14, borderWidth: 1, paddingVertical: 14 },
  logoutText: { fontSize: 15 },
  version: { textAlign: "center", fontSize: 12, paddingBottom: 4 },
  modalContainer: { flex: 1, paddingHorizontal: 24, gap: 24 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { fontSize: 18 },
  modalBody: { gap: 10 },
  label: { fontSize: 14 },
  modalInput: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15 },
  modalNote: { fontSize: 13, lineHeight: 19 },
  modalSaveBtn: { borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  modalSaveBtnText: { color: "#FFFFFF", fontSize: 16 },
});
