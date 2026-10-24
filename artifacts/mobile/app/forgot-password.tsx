import { router } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { apiForgotPassword, apiResetPassword } from "@/lib/apiClient";
import { useColors } from "@/hooks/useColors";
import { useHaptics } from "@/lib/haptics";
import { Body, Button, Display, TextField } from "@/components/primitives";
import { spacing } from "@/constants/spacing";

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    if (!email.trim()) {
      Alert.alert("Missing Info", "Please enter your email.");
      return;
    }
    try {
      setLoading(true);
      await apiForgotPassword(email.trim().toLowerCase());
    } catch {
      // Ignore — we always show the same message below regardless of
      // whether the account exists, so as not to reveal registered emails.
    } finally {
      setLoading(false);
    }
    setStep("reset");
    Alert.alert("Check Your Email", "If an account exists for that email, we've sent a reset code.");
  };

  const handleResetPassword = async () => {
    if (!code.trim() || !newPassword || !confirmPassword) {
      Alert.alert("Missing Info", "Please fill in the code and your new password.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Weak Password", "Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Passwords Don't Match", "Please make sure both passwords match.");
      return;
    }
    try {
      setLoading(true);
      await apiResetPassword(email.trim().toLowerCase(), code.trim(), newPassword);
      await haptics.notify(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Password Updated", "You can now sign in with your new password.", [
        { text: "OK", onPress: () => router.replace("/login") },
      ]);
    } catch (err: any) {
      Alert.alert("Sign In Failed", err?.message || "Invalid or expired code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          onPress={() => (step === "reset" ? setStep("email") : router.back())}
          style={styles.back}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>

        <View style={styles.middle}>
          <View style={styles.header}>
            <Display style={styles.title}>{step === "email" ? "Forgot password" : "Reset password"}</Display>
            <Body color={colors.mutedForeground}>
              {step === "email"
                ? "Enter your email and we'll send you a code to reset your password."
                : "Enter the code we sent you and choose a new password."}
            </Body>
          </View>

          {step === "email" ? (
            <View style={styles.form}>
              <TextField
                label="Email"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
              <Button title={loading ? "Sending…" : "Send Reset Code"} onPress={handleSendCode} loading={loading} disabled={loading} style={styles.btn} />
            </View>
          ) : (
            <View style={styles.form}>
              <TextField label="Reset Code" placeholder="6-digit code" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} />
              <TextField label="New Password" placeholder="New password" value={newPassword} onChangeText={setNewPassword} secureTextEntry autoComplete="new-password" />
              <TextField
                label="Confirm Password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoComplete="new-password"
              />
              <Button title={loading ? "Resetting…" : "Reset Password"} onPress={handleResetPassword} loading={loading} disabled={loading} style={styles.btn} />
              <TouchableOpacity onPress={handleSendCode} disabled={loading} style={styles.resendRow}>
                <Body color={colors.primary} style={{ fontSize: 14 }}>Resend code</Body>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: spacing.xxl },
  back: { alignSelf: "flex-start" },
  middle: { flex: 1, justifyContent: "center", gap: spacing.xxxl, paddingVertical: spacing.xxxl },
  header: { gap: spacing.sm },
  title: {},
  form: { gap: spacing.lg },
  btn: { marginTop: spacing.xs },
  resendRow: { alignItems: "center", paddingTop: spacing.sm },
});
