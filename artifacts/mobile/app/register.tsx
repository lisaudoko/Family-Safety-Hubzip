import { router } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim()) { Alert.alert("Missing Name", "Please enter your name."); return; }
    if (!email.trim() || !email.includes("@")) { Alert.alert("Invalid Email", "Please enter a valid email address."); return; }
    if (password.length < 6) { Alert.alert("Weak Password", "Password must be at least 6 characters."); return; }
    try {
      setLoading(true);
      await register(name.trim(), email.trim().toLowerCase(), password);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/onboarding");
    } catch (err: any) {
      console.error("[register] error:", err?.message || err);
      Alert.alert("Sign Up Failed", err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity onPress={() => router.back()} style={styles.back} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Feather name="arrow-left" size={22} color={colors.foreground} />
      </TouchableOpacity>

      <View style={styles.middle}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Create your account</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Start your family's digital safety journey today — free forever
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Your Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, fontFamily: "Inter_400Regular" }]}
              placeholder="First name or full name"
              placeholderTextColor={colors.mutedForeground}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, fontFamily: "Inter_400Regular" }]}
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
            <Text style={[styles.label, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Password</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TextInput
                style={[styles.inputInner, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                placeholder="Minimum 6 characters"
                placeholderTextColor={colors.mutedForeground}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
                autoComplete="new-password"
              />
              <TouchableOpacity onPress={() => setShowPw(!showPw)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name={showPw ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: loading ? colors.muted : colors.primary }]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={[styles.btnText, { fontFamily: "Inter_700Bold" }]}>
              {loading ? "Creating account…" : "Create Free Account"}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.disclaimer, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Digital Village does not monitor, track, or surveil children's devices. Privacy is a family value.
          </Text>
        </View>
      </View>

      <TouchableOpacity onPress={() => router.push("/login")} style={styles.switchRow}>
        <Text style={[styles.switchText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Already have an account?{" "}
          <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>Sign in</Text>
        </Text>
      </TouchableOpacity>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24 },
  back: { alignSelf: "flex-start" },
  middle: { flex: 1, justifyContent: "center", gap: 32, paddingVertical: 32 },
  header: { gap: 8 },
  title: { fontSize: 28, lineHeight: 34 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  form: { gap: 16 },
  field: { gap: 8 },
  label: { fontSize: 14 },
  input: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15 },
  inputWrap: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center" },
  inputInner: { flex: 1, fontSize: 15 },
  btn: { borderRadius: 16, paddingVertical: 16, alignItems: "center", marginTop: 4 },
  btnText: { color: "#FFFFFF", fontSize: 16 },
  disclaimer: { fontSize: 12, textAlign: "center", lineHeight: 18 },
  switchRow: { alignItems: "center", paddingTop: 8 },
  switchText: { fontSize: 14 },
});
