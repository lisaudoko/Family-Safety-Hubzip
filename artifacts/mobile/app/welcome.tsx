import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import { Image, Platform, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

export default function WelcomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[colors.primary, "#2A5F52"]}
        style={[styles.hero, { paddingTop: insets.top + 40 }]}
      >
        <View style={styles.logoWrap}>
          <Image source={require("../assets/images/icon.png")} style={styles.logo} resizeMode="contain" />
        </View>
        <Text style={[styles.appName, { fontFamily: "Inter_700Bold" }]}>Digital Village</Text>
        <Text style={[styles.tagline, { fontFamily: "Inter_400Regular" }]}>It takes a village to raise a digitally safe family</Text>
      </LinearGradient>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 32, backgroundColor: colors.background }]}>
        <View style={styles.features}>
          {[
            { icon: "📚", label: "Parent micro-courses" },
            { icon: "🛡️", label: "Safety education" },
            { icon: "🏆", label: "Family challenges" },
          ].map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={[styles.featureLabel, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>{f.label}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/register")}
          activeOpacity={0.85}
        >
          <Text style={[styles.primaryBtnText, { fontFamily: "Inter_700Bold" }]}>Get Started — It's Free</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/login")} style={styles.loginBtn}>
          <Text style={[styles.loginText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Already have an account?{" "}
            <Text style={[{ color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>Sign in</Text>
          </Text>
        </TouchableOpacity>

        <Text style={[styles.legal, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          By continuing, you agree to our Terms of Service and Privacy Policy. Digital Village does not monitor or track children's devices.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingBottom: 48, gap: 12 },
  logoWrap: { width: 90, height: 90, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  logo: { width: 70, height: 70, borderRadius: 18 },
  appName: { fontSize: 32, color: "#FFFFFF", letterSpacing: -0.5 },
  tagline: { fontSize: 16, color: "rgba(255,255,255,0.8)", textAlign: "center", lineHeight: 24 },
  bottom: { paddingHorizontal: 24, paddingTop: 28, gap: 16 },
  features: { gap: 10, marginBottom: 8 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureIcon: { fontSize: 20 },
  featureLabel: { fontSize: 15 },
  primaryBtn: { borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  primaryBtnText: { color: "#FFFFFF", fontSize: 16 },
  loginBtn: { alignItems: "center" },
  loginText: { fontSize: 14 },
  legal: { fontSize: 11, textAlign: "center", lineHeight: 16, marginTop: 4 },
});
