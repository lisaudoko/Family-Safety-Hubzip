import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import { Image, StatusBar, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { Body, Button, Display, Small } from "@/components/primitives";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/radius";
import { useColors } from "@/hooks/useColors";

const FEATURES: { icon: keyof typeof Feather.glyphMap; label: string }[] = [
  { icon: "book-open", label: "Parent micro-courses" },
  { icon: "shield", label: "Safety education" },
  { icon: "award", label: "Family challenges" },
];

export default function WelcomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[colors.primary, colors.teal]} style={[styles.hero, { paddingTop: insets.top + 40 }]}>
        <View style={[styles.logoWrap, { backgroundColor: colors.primaryForeground + "26" }]}>
          <Image source={require("../assets/images/icon.png")} style={styles.logo} resizeMode="contain" />
        </View>
        <Display style={[styles.appName, { color: colors.primaryForeground }]}>Digital Village</Display>
        <Body style={[styles.tagline, { color: colors.primaryForeground + "D9" }]}>It takes a village to raise a digitally safe family</Body>
      </LinearGradient>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.xxxl, backgroundColor: colors.background }]}>
        <View style={styles.features}>
          {FEATURES.map(f => (
            <View key={f.label} style={styles.featureRow}>
              <View style={[styles.featureIconWrap, { backgroundColor: colors.secondary }]}>
                <Feather name={f.icon} size={16} color={colors.primary} />
              </View>
              <Body color={colors.foreground}>{f.label}</Body>
            </View>
          ))}
        </View>

        <Button title="Get Started — It's Free" size="lg" onPress={() => router.push("/register")} />

        <TouchableOpacity onPress={() => router.push("/login")} style={styles.loginBtn}>
          <Body color={colors.mutedForeground} style={{ textAlign: "center" }}>
            Already have an account? <Body color={colors.primary}>Sign in</Body>
          </Body>
        </TouchableOpacity>

        <Small style={styles.legal}>
          By continuing, you agree to our Terms of Service and Privacy Policy. Digital Village does not monitor or
          track children&apos;s devices.
        </Small>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xxxl, paddingBottom: spacing.xxxl + 16, gap: spacing.md },
  logoWrap: {
    width: 90,
    height: 90,
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  logo: { width: 70, height: 70, borderRadius: 18 },
  appName: { letterSpacing: -0.5 },
  tagline: { textAlign: "center" },
  bottom: { paddingHorizontal: spacing.xxl, paddingTop: spacing.xxl + 4, gap: spacing.lg },
  features: { gap: spacing.md, marginBottom: spacing.sm },
  featureRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  featureIconWrap: { width: 32, height: 32, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  loginBtn: { alignItems: "center" },
  legal: { textAlign: "center", marginTop: spacing.xs },
});
