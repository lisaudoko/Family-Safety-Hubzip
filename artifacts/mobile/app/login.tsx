import { router } from "expo-router";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useHaptics } from "@/lib/haptics";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const haptics = useHaptics();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing Info", "Please enter your email and password.");
      return;
    }
    try {
      setLoading(true);
      await login(email.trim().toLowerCase(), password);
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
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <LinearGradient
        colors={[colors.primary, colors.teal]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 16 }]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.back}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.badge}>
          <Feather name="sun" size={30} color="#FFFFFF" />
        </View>

        <Text style={[styles.title, { fontFamily: "Inter_700Bold" }]}>Welcome back</Text>
        <Text style={[styles.subtitle, { fontFamily: "Inter_400Regular" }]}>
          Sign in to continue your family's digital safety journey
        </Text>
      </LinearGradient>

      <View style={styles.middle}>
        <View style={styles.form}>
          <View style={styles.field}>
            <Text
              style={[styles.label, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}
            >
              Email
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.foreground,
                  fontFamily: "Inter_400Regular",
                },
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

          <View style={styles.field}>
            <Text
              style={[styles.label, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}
            >
              Password
            </Text>
            <View
              style={[
                styles.inputWrap,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <TextInput
                style={[
                  styles.inputInner,
                  { color: colors.foreground, fontFamily: "Inter_400Regular" },
                ]}
                placeholder="Your password"
                placeholderTextColor={colors.mutedForeground}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
                autoComplete="password"
              />
              <TouchableOpacity
                onPress={() => setShowPw(!showPw)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather
                  name={showPw ? "eye-off" : "eye"}
                  size={18}
                  color={colors.mutedForeground}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity onPress={() => router.push("/forgot-password")} style={styles.forgotRow}>
            <Text style={[styles.forgotText, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>
              Forgot password?
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.btn,
              { backgroundColor: loading ? colors.muted : colors.primary },
            ]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={[styles.btnText, { fontFamily: "Inter_700Bold" }]}>
              {loading ? "Signing in…" : "Sign In"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity onPress={() => router.push("/register")} style={styles.switchRow}>
        <Text
          style={[
            styles.switchText,
            { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
          ]}
        >
          Don't have an account?{" "}
          <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>Create one</Text>
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  hero: {
    paddingHorizontal: 24,
    paddingBottom: 36,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    gap: 10,
  },
  back: { alignSelf: "flex-start", marginBottom: 8 },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: { fontSize: 30, lineHeight: 36, color: "#FFFFFF" },
  subtitle: { fontSize: 15, lineHeight: 23, color: "rgba(255,255,255,0.9)" },
  middle: {
    flex: 1,
    justifyContent: "center",
    gap: 32,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  form: { gap: 16 },
  field: { gap: 8 },
  label: { fontSize: 14 },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 1 },
    }),
  },
  inputWrap: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 1 },
    }),
  },
  inputInner: { flex: 1, fontSize: 15 },
  forgotRow: { alignSelf: "flex-end" },
  forgotText: { fontSize: 13 },
  btn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    ...Platform.select({
      ios: { shadowColor: "#F97316", shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
      android: { elevation: 4 },
    }),
  },
  btnText: { color: "#FFFFFF", fontSize: 16 },
  switchRow: { alignItems: "center", paddingTop: 8 },
  switchText: { fontSize: 14 },
});
