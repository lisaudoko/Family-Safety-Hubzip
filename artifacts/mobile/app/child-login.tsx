import { router } from "expo-router";
import React, { useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useHaptics } from "@/lib/haptics";
import { apiGetFamilyByCode, type ApiFamilyByCodeChild } from "@/lib/apiClient";
import { Body, Button, Card, Display, TextField } from "@/components/primitives";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/radius";
import { shadow } from "@/constants/elevation";

type Step = "code" | "child" | "pin";

export default function ChildLoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { childLogin } = useAuth();
  const haptics = useHaptics();

  const [step, setStep] = useState<Step>("code");
  const [familyCode, setFamilyCode] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [children, setChildren] = useState<ApiFamilyByCodeChild[]>([]);
  const [selectedChild, setSelectedChild] = useState<ApiFamilyByCodeChild | null>(null);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFindFamily = async () => {
    const code = familyCode.trim().toUpperCase();
    if (!code) {
      Alert.alert("Missing Code", "Please enter your family's code.");
      return;
    }
    try {
      setLoading(true);
      const { family, children: kids } = await apiGetFamilyByCode(code);
      if (kids.length === 0) {
        Alert.alert("No Kids Found", "Ask your parent to add you in the app first.");
        return;
      }
      setFamilyName(family.name);
      setChildren(kids);
      setStep("child");
    } catch (err: any) {
      Alert.alert("Family Not Found", "Double check the code with your parent and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePickChild = (child: ApiFamilyByCodeChild) => {
    setSelectedChild(child);
    setPin("");
    setStep("pin");
  };

  const handleChildLogin = async () => {
    if (!selectedChild) return;
    if (!pin.trim()) {
      Alert.alert("Missing PIN", "Please enter your PIN.");
      return;
    }
    try {
      setLoading(true);
      await childLogin(selectedChild.id, pin.trim());
      await haptics.notify(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (err: any) {
      const message =
        typeof err?.message === "string" && err.message.length > 0
          ? err.message
          : "That PIN didn't work. Try again.";
      Alert.alert("Couldn't Sign In", message);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (step === "pin") {
      setStep("child");
      setPin("");
    } else if (step === "child") {
      setStep("code");
      setChildren([]);
    } else {
      router.back();
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <LinearGradient
        colors={[colors.primary, colors.teal]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + spacing.lg }]}
      >
        <TouchableOpacity onPress={goBack} style={styles.back} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color={colors.primaryForeground} />
        </TouchableOpacity>

        <View style={[styles.badge, { backgroundColor: colors.primaryForeground + "40" }]}>
          <Feather name="smile" size={30} color={colors.primaryForeground} />
        </View>

        <Display style={[styles.title, { color: colors.primaryForeground }]}>
          {step === "code" && "Kid Login"}
          {step === "child" && (familyName || "Your Family")}
          {step === "pin" && (selectedChild?.name ?? "Enter PIN")}
        </Display>
        <Body style={[styles.subtitle, { color: colors.primaryForeground + "E6" }]}>
          {step === "code" && "Enter the code your parent gave you"}
          {step === "child" && "Tap your name"}
          {step === "pin" && "Enter your PIN to sign in"}
        </Body>
      </LinearGradient>

      <View style={styles.middle}>
        {step === "code" && (
          <View style={styles.form}>
            <TextField
              label="Family Code"
              placeholder="ABC123"
              value={familyCode}
              onChangeText={setFamilyCode}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={8}
              style={styles.codeInput}
            />
            <Button title={loading ? "Looking…" : "Continue"} onPress={handleFindFamily} loading={loading} disabled={loading} style={styles.btn} />
          </View>
        )}

        {step === "child" && (
          <View style={styles.form}>
            {children.map(child => (
              <Card key={child.id} variant="outline" pressable onPress={() => handlePickChild(child)} style={styles.childRow}>
                <View style={[styles.childAvatar, { backgroundColor: colors.secondary }]}>
                  <Feather name="user" size={20} color={colors.primary} />
                </View>
                <Body color={colors.foreground} style={{ flex: 1 }}>{child.name}</Body>
                <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
              </Card>
            ))}
          </View>
        )}

        {step === "pin" && (
          <View style={styles.form}>
            <TextField
              label="PIN"
              placeholder="••••"
              value={pin}
              onChangeText={setPin}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              style={styles.codeInput}
            />
            <Button title={loading ? "Signing in…" : "Sign In"} onPress={handleChildLogin} loading={loading} disabled={loading} style={styles.btn} />
          </View>
        )}
      </View>
    </ScrollView>
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
  codeInput: { textAlign: "center", fontSize: 24, letterSpacing: 4 },
  childRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  childAvatar: { width: 40, height: 40, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  btn: { marginTop: spacing.xs, ...shadow.md },
});
