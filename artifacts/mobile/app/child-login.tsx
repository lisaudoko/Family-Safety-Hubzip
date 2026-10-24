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
import { apiGetFamilyByCode, type ApiFamilyByCodeChild } from "@/lib/apiClient";

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
          onPress={goBack}
          style={styles.back}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.badge}>
          <Feather name="smile" size={30} color="#FFFFFF" />
        </View>

        <Text style={[styles.title, { fontFamily: "Inter_700Bold" }]}>
          {step === "code" && "Kid Login"}
          {step === "child" && (familyName || "Your Family")}
          {step === "pin" && (selectedChild?.name ?? "Enter PIN")}
        </Text>
        <Text style={[styles.subtitle, { fontFamily: "Inter_400Regular" }]}>
          {step === "code" && "Enter the code your parent gave you"}
          {step === "child" && "Tap your name"}
          {step === "pin" && "Enter your PIN to sign in"}
        </Text>
      </LinearGradient>

      <View style={styles.middle}>
        {step === "code" && (
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
                Family Code
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.codeInput,
                  { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, fontFamily: "Inter_700Bold" },
                ]}
                placeholder="ABC123"
                placeholderTextColor={colors.mutedForeground}
                value={familyCode}
                onChangeText={setFamilyCode}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={8}
              />
            </View>

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: loading ? colors.muted : colors.primary }]}
              onPress={handleFindFamily}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={[styles.btnText, { fontFamily: "Inter_700Bold" }]}>
                {loading ? "Looking…" : "Continue"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {step === "child" && (
          <View style={styles.form}>
            {children.map(child => (
              <TouchableOpacity
                key={child.id}
                style={[styles.childRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handlePickChild(child)}
                activeOpacity={0.8}
              >
                <View style={[styles.childAvatar, { backgroundColor: colors.secondary }]}>
                  <Feather name="user" size={20} color={colors.primary} />
                </View>
                <Text style={[styles.childName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                  {child.name}
                </Text>
                <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === "pin" && (
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
                PIN
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.codeInput,
                  { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, fontFamily: "Inter_700Bold" },
                ]}
                placeholder="••••"
                placeholderTextColor={colors.mutedForeground}
                value={pin}
                onChangeText={setPin}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={6}
              />
            </View>

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: loading ? colors.muted : colors.primary }]}
              onPress={handleChildLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={[styles.btnText, { fontFamily: "Inter_700Bold" }]}>
                {loading ? "Signing in…" : "Sign In"}
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
  codeInput: {
    textAlign: "center",
    fontSize: 24,
    letterSpacing: 4,
  },
  childRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  childAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  childName: { flex: 1, fontSize: 16 },
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
});
