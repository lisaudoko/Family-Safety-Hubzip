import { router } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useHaptics } from "@/lib/haptics";
import { Body, Button, Display, TextField } from "@/components/primitives";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/radius";
import { shadow } from "@/constants/elevation";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const haptics = useHaptics();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password.trim()) {
      setEmailError("");
      Alert.alert("Missing Info", "Please enter your email and password.");
      return;
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setEmailError("");
    try {
      setLoading(true);
      await login(trimmedEmail.toLowerCase(), password);
      await haptics.notify(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (err: any) {
      console.error("[login] unexpected error:", err?.message || err);
      const message =
        typeof err?.message === "string" && err.message.length > 0
          ? err.message
          : "Please check your credentials and try again.";
      Alert.alert("Sign In Failed", message, [
        { text: "Try Again", style: "cancel" },
        { text: "Create Account", onPress: () => router.push("/register") },
      ]);
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
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={[colors.primary, colors.teal]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + spacing.lg }]}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.back} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="arrow-left" size={22} color={colors.primaryForeground} />
          </TouchableOpacity>

          <View style={[styles.badge, { backgroundColor: colors.primaryForeground + "40" }]}>
            <Feather name="sun" size={30} color={colors.primaryForeground} />
          </View>

          <Display style={[styles.title, { color: colors.primaryForeground }]}>Welcome back</Display>
          <Body style={[styles.subtitle, { color: colors.primaryForeground + "E6" }]}>Sign in to continue your family&apos;s digital safety journey</Body>
        </LinearGradient>

        <View style={styles.middle}>
          <View style={styles.form}>
            <TextField
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (emailError) setEmailError("");
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              errorText={emailError || undefined}
            />

            <TextField
              label="Password"
              placeholder="Your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPw}
              autoComplete="password"
              rightElement={
                <TouchableOpacity onPress={() => setShowPw(!showPw)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name={showPw ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
              }
            />

            <TouchableOpacity onPress={() => router.push("/forgot-password")} style={styles.forgotRow}>
              <Body color={colors.primary} style={{ fontSize: 13 }}>Forgot password?</Body>
            </TouchableOpacity>

            <Button title={loading ? "Signing in…" : "Sign In"} onPress={handleLogin} loading={loading} disabled={loading} style={styles.btn} />
          </View>
        </View>

        <TouchableOpacity onPress={() => router.push("/register")} style={styles.switchRow}>
          <Body color={colors.mutedForeground}>
            Don&apos;t have an account? <Body color={colors.primary}>Create one</Body>
          </Body>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/child-login")} style={styles.switchRow}>
          <Body color={colors.mutedForeground}>
            Are you a kid? <Body color={colors.primary}>Log in here</Body>
          </Body>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingBottom: spacing.xxl },
  hero: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxxl + 4,
    borderBottomLeftRadius: radius.xl + 8,
    borderBottomRightRadius: radius.xl + 8,
    gap: spacing.sm,
  },
  back: { alignSelf: "flex-start", marginBottom: spacing.sm },
  badge: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  title: {},
  subtitle: {},
  middle: { flex: 1, justifyContent: "center", gap: spacing.xxxl, paddingHorizontal: spacing.xxl, paddingTop: spacing.xxxl },
  form: { gap: spacing.lg },
  forgotRow: { alignSelf: "flex-end" },
  btn: { marginTop: spacing.xs, ...shadow.md },
  switchRow: { alignItems: "center", paddingTop: spacing.sm },
});
