import { router } from "expo-router";
import React, { useState } from "react";
import { Platform, StyleSheet, TouchableOpacity, View, Alert } from "react-native";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useHaptics } from "@/lib/haptics";
import { Body, Button, Caption, H1, TextField } from "@/components/primitives";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/radius";
import { openPrivacyPolicy, openTerms } from "@/lib/legal";
import { useParentGate } from "@/components/ParentGate";

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const haptics = useHaptics();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  // Pre-login screen: a child may be holding the phone, so links out are gated.
  const { gate, guard } = useParentGate();

  const handleRegister = async () => {
    if (!name.trim()) { Alert.alert("Missing Name", "Please enter your name."); return; }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { Alert.alert("Invalid Email", "Please enter a valid email address."); return; }
    if (password.length < 6) { Alert.alert("Weak Password", "Password must be at least 6 characters."); return; }
    if (!agreed) { Alert.alert("Terms", "Please agree to the Terms of Use and Privacy Policy to create your account."); return; }
    try {
      setLoading(true);
      await register(name.trim(), email.trim().toLowerCase(), password, agreed);
      await haptics.notify(Haptics.NotificationFeedbackType.Success);
      router.replace("/onboarding");
    } catch (err: any) {
      console.error("[register] unexpected error:", err?.message || err);
      Alert.alert("Sign Up Failed", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAwareScrollViewCompat
      bottomOffset={24}
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xxl }]}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity onPress={() => router.back()} style={styles.back} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Feather name="arrow-left" size={22} color={colors.foreground} />
      </TouchableOpacity>

      <View style={styles.middle}>
        <View style={styles.header}>
          <H1>Create your account</H1>
          <Body color={colors.mutedForeground}>Start your family&apos;s digital safety journey today — free forever</Body>
        </View>

        <View style={styles.form}>
          <TextField label="Your Name" placeholder="First name or full name" value={name} onChangeText={setName} autoCapitalize="words" autoComplete="name" />

          <TextField
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <TextField
            label="Password"
            placeholder="Minimum 6 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPw}
            autoComplete="new-password"
            rightElement={
              <TouchableOpacity onPress={() => setShowPw(!showPw)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name={showPw ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            }
          />

          <View style={styles.agreeRow}>
            <TouchableOpacity
              onPress={() => setAgreed(v => !v)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agreed }}
              accessibilityLabel="I agree to the Terms of Use and Privacy Policy"
              style={[
                styles.checkbox,
                { borderColor: agreed ? colors.primary : colors.border, backgroundColor: agreed ? colors.primary : "transparent" },
              ]}
            >
              {agreed && <Feather name="check" size={14} color={colors.primaryForeground} />}
            </TouchableOpacity>
            <Body color={colors.foreground} style={styles.agreeText}>
              I agree to the{" "}
              <Body color={colors.primary} style={styles.agreeLink} onPress={() => guard(() => void openTerms())}>Terms of Use</Body>
              {" "}and{" "}
              <Body color={colors.primary} style={styles.agreeLink} onPress={() => guard(() => void openPrivacyPolicy())}>Privacy Policy</Body>
            </Body>
          </View>

          <Button title={loading ? "Creating account…" : "Create Free Account"} onPress={handleRegister} loading={loading} disabled={loading || !agreed} style={styles.btn} />

          <Caption color={colors.mutedForeground} style={styles.disclaimer}>
            We never read your family&apos;s messages, browsing history or location, and we never sell your data.
          </Caption>
        </View>
      </View>

      <TouchableOpacity onPress={() => router.push("/login")} style={styles.switchRow}>
        <Body color={colors.mutedForeground}>
          Already have an account? <Body color={colors.primary}>Sign in</Body>
        </Body>
      </TouchableOpacity>
      {gate}
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: spacing.xxl },
  back: { alignSelf: "flex-start" },
  middle: { flex: 1, justifyContent: "center", gap: spacing.xxxl, paddingVertical: spacing.xxxl },
  header: { gap: spacing.sm },
  form: { gap: spacing.lg },
  btn: { marginTop: spacing.xs },
  agreeRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  checkbox: { width: 22, height: 22, borderRadius: radius.sm, borderWidth: 2, alignItems: "center", justifyContent: "center", marginTop: 1 },
  agreeText: { flex: 1, fontSize: 14 },
  agreeLink: { fontSize: 14, textDecorationLine: "underline" },
  disclaimer: { textAlign: "center" },
  switchRow: { alignItems: "center", paddingTop: spacing.sm },
});
