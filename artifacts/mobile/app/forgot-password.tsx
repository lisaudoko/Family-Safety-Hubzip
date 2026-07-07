import { router } from "expo-router";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { apiForgotPassword, apiResetPassword } from "@/lib/apiClient";
import { useColors } from "@/hooks/useColors";

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
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
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
      ]}
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
          <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            {step === "email" ? "Forgot password" : "Reset password"}
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {step === "email"
              ? "Enter your email and we'll send you a code to reset your password."
              : "Enter the code we sent you and choose a new password."}
          </Text>
        </View>

        {step === "email" ? (
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Email</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, fontFamily: "Inter_400Regular" },
                ]}
                placeholder="you@example.com"
                placeholderTextColor={colors.mutedForeground}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: loading ? colors.muted : colors.primary }]}
              onPress={handleSendCode}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={[styles.btnText, { fontFamily: "Inter_700Bold" }]}>
                {loading ? "Sending…" : "Send Reset Code"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Reset Code</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, fontFamily: "Inter_400Regular" },
                ]}
                placeholder="6-digit code"
                placeholderTextColor={colors.mutedForeground}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>New Password</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, fontFamily: "Inter_400Regular" },
                ]}
                placeholder="New password"
                placeholderTextColor={colors.mutedForeground}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoComplete="new-password"
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Confirm Password</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, fontFamily: "Inter_400Regular" },
                ]}
                placeholder="Confirm new password"
                placeholderTextColor={colors.mutedForeground}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoComplete="new-password"
              />
            </View>

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: loading ? colors.muted : colors.primary }]}
              onPress={handleResetPassword}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={[styles.btnText, { fontFamily: "Inter_700Bold" }]}>
                {loading ? "Resetting…" : "Reset Password"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSendCode} disabled={loading} style={styles.resendRow}>
              <Text style={[styles.resendText, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>
                Resend code
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  back: { alignSelf: "flex-start" },
  middle: {
    flex: 1,
    justifyContent: "center",
    gap: 32,
    paddingVertical: 32,
  },
  header: { gap: 10 },
  title: { fontSize: 30, lineHeight: 36 },
  subtitle: { fontSize: 15, lineHeight: 23 },
  form: { gap: 16 },
  field: { gap: 8 },
  label: { fontSize: 14 },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
  btn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  btnText: { color: "#FFFFFF", fontSize: 16 },
  resendRow: { alignItems: "center", paddingTop: 8 },
  resendText: { fontSize: 14 },
});
