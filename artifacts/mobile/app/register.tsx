import { router } from "expo-router";
import React, { useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useHaptics } from "@/lib/haptics";
import { Body, Button, Caption, H1, TextField } from "@/components/primitives";
import { spacing } from "@/constants/spacing";

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

  const handleRegister = async () => {
    if (!name.trim()) { Alert.alert("Missing Name", "Please enter your name."); return; }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { Alert.alert("Invalid Email", "Please enter a valid email address."); return; }
    if (password.length < 6) { Alert.alert("Weak Password", "Password must be at least 6 characters."); return; }
    try {
      setLoading(true);
      await register(name.trim(), email.trim().toLowerCase(), password);
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
    <ScrollView
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

          <Button title={loading ? "Creating account…" : "Create Free Account"} onPress={handleRegister} loading={loading} disabled={loading} style={styles.btn} />

          <Caption color={colors.mutedForeground} style={styles.disclaimer}>
            Digital Village does not monitor, track, or surveil children&apos;s devices. Privacy is a family value.
          </Caption>
        </View>
      </View>

      <TouchableOpacity onPress={() => router.push("/login")} style={styles.switchRow}>
        <Body color={colors.mutedForeground}>
          Already have an account? <Body color={colors.primary}>Sign in</Body>
        </Body>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: spacing.xxl },
  back: { alignSelf: "flex-start" },
  middle: { flex: 1, justifyContent: "center", gap: spacing.xxxl, paddingVertical: spacing.xxxl },
  header: { gap: spacing.sm },
  form: { gap: spacing.lg },
  btn: { marginTop: spacing.xs },
  disclaimer: { textAlign: "center" },
  switchRow: { alignItems: "center", paddingTop: spacing.sm },
});
