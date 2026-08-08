import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { Alert, Linking, Modal, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import { useFamily } from "@/context/FamilyContext";
import { useCurriculum } from "@/hooks/useCurriculum";
import { useColors } from "@/hooks/useColors";
import { useHaptics } from "@/lib/haptics";
import { apiCreateSupportCode, apiResendVerification, apiVerifyEmail } from "@/lib/apiClient";
import { Avatar, Badge, Body, BodyStrong, Button, Card, Caption, Display, H2, H3, Small, TextField } from "@/components/primitives";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/radius";
import { fontFamily } from "@/constants/typography";

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
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );
  const isParent = user?.role === "parent";

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

  const settingsItems: { icon: React.ComponentProps<typeof Feather>["name"]; label: string; onPress: () => void }[] = [
    { icon: "user", label: "Edit Profile", onPress: () => { setEditName(user?.name ?? ""); setEditModal(true); } },
    { icon: "eye", label: "Accessibility", onPress: () => router.push("/settings/accessibility") },
    { icon: "bell", label: "Notifications", onPress: handleNotifications },
    { icon: "shield", label: "Privacy Policy", onPress: handlePrivacyPolicy },
    { icon: "help-circle", label: "Help & Support", onPress: handleHelp },
    ...(isParent ? [{ icon: "key" as const, label: "Get Support Access Code", onPress: handleGetSupport }] : []),
  ];

  const privacyItems = [
    { icon: "shield" as const, title: "Our Approach", desc: "Digital Village does not monitor, track, or spy on children's devices. We build safety through education and conversation.", color: colors.success },
    { icon: "eye-off" as const, title: "No Surveillance", desc: "No iMessage reading, no keystroke logging, no unauthorized photo access, no background recording.", color: colors.info },
    { icon: "lock" as const, title: "Data Privacy", desc: "All family data stays on your device. We don't sell or share your information.", color: colors.accent },
  ];

  return (
    <ScrollView
      ref={scrollRef}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: topPad + spacing.lg, paddingBottom: bottomPad + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <Card variant="outline" style={styles.profileCard}>
        <Avatar initial={user?.name?.[0] ?? "P"} size={60} />
        <View style={styles.profileInfo}>
          <H2 style={{ marginBottom: 0 }}>{user?.name ?? "Parent"}</H2>
          <Caption color={colors.mutedForeground}>{user?.email}</Caption>
          <Badge label={user?.isPremium ? "Premium" : "Free Plan"} tone={user?.isPremium ? colors.accent : colors.mutedForeground} variant="soft" icon={user?.isPremium ? "star" : "user"} />
        </View>
      </Card>

      {user?.role === "parent" && user?.emailVerified === false && (
        <Card variant="outline" style={styles.verifyCard}>
          <View style={styles.upgradeContent}>
            <Feather name="mail" size={20} color={colors.primary} />
            <View>
              <Body color={colors.foreground}>Verify your email</Body>
              <Caption color={colors.mutedForeground}>We sent you a code when you signed up.</Caption>
            </View>
          </View>
          <TouchableOpacity onPress={() => setVerifyModal(true)} activeOpacity={0.8}>
            <Small style={{ color: colors.primary, fontSize: 13 }}>Enter code</Small>
          </TouchableOpacity>
        </Card>
      )}

      <View style={styles.statsRow}>
        {[
          { label: "Courses Done", value: completedCourses, icon: "book-open" as const },
          { label: "Lessons Done", value: completedLessons, icon: "check-circle" as const },
          { label: "Badges Earned", value: earnedBadges.length, icon: "award" as const },
        ].map(s => (
          <Card key={s.label} variant="outline" style={styles.statCard}>
            <Feather name={s.icon} size={16} color={colors.primary} />
            <H2 style={styles.statValue}>{s.value}</H2>
            <Small color={colors.mutedForeground} style={{ textAlign: "center" }}>{s.label}</Small>
          </Card>
        ))}
      </View>

      {!user?.isPremium && (
        <Card variant="flat" pressable onPress={() => router.push("/subscription")} style={[styles.upgradeCard, { backgroundColor: colors.accent }]}>
          <View style={styles.upgradeContent}>
            <Feather name="star" size={20} color={colors.accentForeground} />
            <View>
              <Body color={colors.accentForeground}>Unlock Premium</Body>
              <Caption color={colors.accentForeground + "CC"}>All courses, advanced challenges & more</Caption>
            </View>
          </View>
          <Feather name="chevron-right" size={18} color={colors.accentForeground} />
        </Card>
      )}

      {user?.isPremium && (
        <Card
          variant="outline"
          pressable
          style={styles.upgradeCard}
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
              <Body color={colors.foreground}>{managingSubscription ? "Opening..." : "Manage Subscription"}</Body>
              <Caption color={colors.mutedForeground}>Update payment, change plan, or cancel</Caption>
            </View>
          </View>
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        </Card>
      )}

      <View>
        <H3 style={styles.sectionTitle}>Your Badges</H3>
        {earnedBadges.length === 0 ? (
          <Card variant="outline" style={styles.emptyBadges}>
            <Feather name="award" size={28} color={colors.mutedForeground} />
            <Caption color={colors.mutedForeground} style={{ textAlign: "center" }}>Complete courses and challenges to earn badges</Caption>
          </Card>
        ) : (
          <View style={styles.badgesGrid}>
            {earnedBadges.map(badge => (
              <View key={badge.id} style={[styles.badge, { backgroundColor: badge.color + "18", borderColor: badge.color + "33" }]}>
                <Feather name={badge.iconName as never} size={22} color={badge.color} />
                <Small style={{ color: badge.color, textAlign: "center" }}>{badge.title}</Small>
                <Small color={colors.mutedForeground} style={{ textAlign: "center", lineHeight: 15 }}>{badge.description}</Small>
              </View>
            ))}
          </View>
        )}
        {unearnedBadges.length > 0 && (
          <View style={styles.lockedBadgesRow}>
            <Caption color={colors.mutedForeground} style={{ flex: 1 }}>{unearnedBadges.length} more to unlock</Caption>
            {unearnedBadges.slice(0, 5).map(badge => (
              <View key={badge.id} style={[styles.lockedBadge, { backgroundColor: colors.muted }]}>
                <Feather name="lock" size={14} color={colors.mutedForeground} />
              </View>
            ))}
          </View>
        )}
      </View>

      <View>
        <H3 style={styles.sectionTitle}>Settings</H3>
        <Card variant="outline" style={styles.settingsList} padding={0}>
          {settingsItems.map((item, idx, arr) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.settingsRow, idx < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
              onPress={item.onPress}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <Feather name={item.icon} size={18} color={colors.foreground} />
              <Body color={colors.foreground} style={styles.settingsLabel}>{item.label}</Body>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </Card>
      </View>

      <View>
        <H3 style={styles.sectionTitle}>Privacy & Safety</H3>
        {privacyItems.map(item => (
          <Card key={item.title} variant="outline" style={styles.privacyCard}>
            <View style={[styles.privacyIcon, { backgroundColor: item.color + "22" }]}>
              <Feather name={item.icon} size={18} color={item.color} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <BodyStrong color={colors.foreground}>{item.title}</BodyStrong>
              <Caption color={colors.mutedForeground}>{item.desc}</Caption>
            </View>
          </Card>
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
          <BodyStrong color={colors.primary}>Switch Back to Parent</BodyStrong>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={[styles.logoutBtn, { borderColor: colors.destructive + "44" }]} onPress={handleLogout} activeOpacity={0.8}>
        <Feather name="log-out" size={18} color={colors.destructive} />
        <BodyStrong color={colors.destructive}>Sign Out</BodyStrong>
      </TouchableOpacity>

      <Caption color={colors.mutedForeground} style={styles.version}>Digital Village v1.0.0</Caption>

      <Modal visible={editModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditModal(false)}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background, paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xxl }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <H3 style={{ marginBottom: 0 }}>Edit Profile</H3>
            <View style={{ width: 22 }} />
          </View>
          <View style={styles.modalBody}>
            <TextField
              label="Display Name"
              value={editName}
              onChangeText={setEditName}
              placeholder="Your name"
              autoCapitalize="words"
              autoFocus
            />
            <Caption color={colors.mutedForeground}>Name changes update your display only. Your email cannot be changed here.</Caption>
          </View>
          <Button
            title="Save Changes"
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
          />
        </View>
      </Modal>

      <Modal visible={verifyModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setVerifyModal(false)}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background, paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xxl }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setVerifyModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <H3 style={{ marginBottom: 0 }}>Verify Email</H3>
            <View style={{ width: 22 }} />
          </View>
          <View style={styles.modalBody}>
            <TextField
              label="Verification Code"
              value={verifyCode}
              onChangeText={setVerifyCode}
              placeholder="6-digit code"
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
            <Caption color={colors.mutedForeground}>Check your email ({user?.email}) for the code we sent when you signed up.</Caption>
            <TouchableOpacity onPress={handleResendVerification} disabled={resendLoading} style={{ paddingTop: spacing.xs }}>
              <Body color={colors.primary} style={{ fontSize: 14, fontFamily: fontFamily.medium }}>{resendLoading ? "Sending…" : "Resend code"}</Body>
            </TouchableOpacity>
          </View>
          <Button title={verifyLoading ? "Verifying…" : "Verify Email"} loading={verifyLoading} disabled={verifyLoading || !verifyCode.trim()} onPress={handleVerifyEmail} />
        </View>
      </Modal>

      <Modal visible={supportModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSupportModal(false)}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background, paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xxl }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSupportModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <H3 style={{ marginBottom: 0 }}>Support Access Code</H3>
            <View style={{ width: 22 }} />
          </View>
          <View style={styles.modalBody}>
            <Caption color={colors.mutedForeground}>
              If Digital Village support asked you to generate a code to help fix an issue with your account, tap below. The code lets our team into your family&apos;s data for a limited time only — every action they take is logged and visible to you.
            </Caption>

            {supportCode ? (
              <Card variant="outline" style={styles.supportCodeCard}>
                <Display style={{ letterSpacing: 4 }}>{supportCode}</Display>
                <Small color={supportSecondsLeft > 0 ? colors.mutedForeground : colors.destructive}>
                  {supportSecondsLeft > 0
                    ? `Expires in ${Math.floor(supportSecondsLeft / 60)}:${String(supportSecondsLeft % 60).padStart(2, "0")}`
                    : "Expired — generate a new code"}
                </Small>
              </Card>
            ) : null}

            {supportError ? <Caption color={colors.destructive}>{supportError}</Caption> : null}
          </View>
          <Button
            title={supportLoading ? "Generating…" : supportCode ? "Generate New Code" : "Generate Code"}
            loading={supportLoading}
            disabled={supportLoading}
            onPress={requestSupportCode}
          />
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl, gap: spacing.xxl },
  profileCard: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  profileInfo: { flex: 1, gap: 5 },
  statsRow: { flexDirection: "row", gap: spacing.sm },
  statCard: { flex: 1, alignItems: "center", gap: spacing.xs },
  statValue: { marginTop: 0 },
  upgradeCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  upgradeContent: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  verifyCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { marginBottom: spacing.md },
  emptyBadges: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl },
  badgesGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  badge: { width: "47%", borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: spacing.xs, alignItems: "center" },
  lockedBadgesRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
  lockedBadge: { width: 36, height: 36, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  settingsList: { overflow: "hidden" },
  settingsRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, paddingVertical: spacing.md + 1, gap: spacing.md },
  settingsLabel: { flex: 1 },
  privacyCard: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.sm, alignItems: "flex-start" },
  privacyIcon: { width: 38, height: 38, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, borderRadius: radius.md, borderWidth: 1, paddingVertical: spacing.md },
  version: { textAlign: "center", paddingBottom: spacing.xs },
  modalContainer: { flex: 1, paddingHorizontal: spacing.xxl, gap: spacing.xxl },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalBody: { gap: spacing.sm },
  supportCodeCard: { alignItems: "center", gap: spacing.xs, paddingVertical: spacing.xxl, marginTop: spacing.sm },
});
