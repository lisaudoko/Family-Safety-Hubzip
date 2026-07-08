import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import { useFamily } from "@/context/FamilyContext";
import { useColors } from "@/hooks/useColors";
import { AGE_BANDS, AgeBand } from "@/data/seed";
import { useHaptics } from "@/lib/haptics";

type Step = "family" | "children" | "done";

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, completeOnboarding } = useAuth();
  const { initFamily, addChild } = useFamily();
  const haptics = useHaptics();

  const [step, setStep] = useState<Step>("family");
  const [familyName, setFamilyName] = useState("");
  const [children, setChildren] = useState<{ name: string; ageBand: AgeBand }[]>([{ name: "", ageBand: "10-13" }]);
  const [loading, setLoading] = useState(false);

  const handleFamilyNext = () => {
    if (!familyName.trim()) { Alert.alert("Family Name", "Please enter a name for your family."); return; }
    setStep("children");
  };

  const handleAddChild = () => {
    if (children.length >= 6) return;
    setChildren([...children, { name: "", ageBand: "10-13" }]);
  };

  const handleRemoveChild = (index: number) => {
    setChildren(children.filter((_, i) => i !== index));
  };

  const handleChildName = (index: number, name: string) => {
    const updated = [...children];
    updated[index] = { ...updated[index]!, name };
    setChildren(updated);
  };

  const handleAgeBand = (index: number, ageBand: AgeBand) => {
    const updated = [...children];
    updated[index] = { ...updated[index]!, ageBand };
    setChildren(updated);
  };

  const handleFinish = async () => {
    if (!user) return;
    const namedChildren = children.filter(c => c.name.trim());
    const familyId = user.familyId || ("f" + user.id);
    try {
      setLoading(true);
      await initFamily(familyName.trim(), familyId, user.id);
      for (const child of namedChildren) {
        await addChild(child.name.trim(), child.ageBand, familyId);
      }
      await completeOnboarding();
      await haptics.notify(Haptics.NotificationFeedbackType.Success);
      setStep("done");
      setTimeout(() => router.replace("/(tabs)"), 1400);
    } catch (err: any) {
      console.error("[onboarding] handleFinish error:", err?.message || err);
      Alert.alert("Error", err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const STEP_INFO: Record<Step, { num: number; total: number }> = {
    family: { num: 1, total: 2 },
    children: { num: 2, total: 2 },
    done: { num: 2, total: 2 },
  };
  const stepInfo = STEP_INFO[step];

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.progressWrap}>
        {[1, 2].map(n => (
          <View key={n} style={[styles.progressDot, { backgroundColor: n <= stepInfo.num ? colors.primary : colors.muted, flex: 1 }]} />
        ))}
      </View>

      {step === "family" && (
        <>
          <View style={styles.stepHeader}>
            <View style={[styles.stepIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="home" size={28} color={colors.primary} />
            </View>
            <Text style={[styles.stepTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Name your family</Text>
            <Text style={[styles.stepDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>This appears in your Family Dashboard and Technology Agreement.</Text>
          </View>
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Family Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, fontFamily: "Inter_400Regular" }]}
              placeholder={user?.name ? `The ${user.name} Family` : "The Smith Family"}
              placeholderTextColor={colors.mutedForeground}
              value={familyName}
              onChangeText={setFamilyName}
              autoCapitalize="words"
            />
          </View>
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={handleFamilyNext} activeOpacity={0.85}>
            <Text style={[styles.btnText, { fontFamily: "Inter_700Bold" }]}>Continue</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={async () => { await completeOnboarding(); router.replace("/(tabs)"); }}>
            <Text style={[styles.skipText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Skip for now</Text>
          </TouchableOpacity>
        </>
      )}

      {step === "children" && (
        <>
          <View style={styles.stepHeader}>
            <View style={[styles.stepIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="users" size={28} color={colors.primary} />
            </View>
            <Text style={[styles.stepTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Add your children</Text>
            <Text style={[styles.stepDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>We use age bands to personalize content — no exact ages stored.</Text>
          </View>

          <View style={styles.childrenList}>
            {children.map((child, index) => (
              <View key={index} style={[styles.childRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.childInputWrap}>
                  <TextInput
                    style={[styles.childInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                    placeholder={`Child ${index + 1} name`}
                    placeholderTextColor={colors.mutedForeground}
                    value={child.name}
                    onChangeText={(t) => handleChildName(index, t)}
                    autoCapitalize="words"
                  />
                  {children.length > 1 && (
                    <TouchableOpacity onPress={() => handleRemoveChild(index)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Feather name="x" size={16} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.ageBandRow}>
                  {AGE_BANDS.map(band => (
                    <TouchableOpacity
                      key={band}
                      style={[styles.bandBtn, { borderColor: child.ageBand === band ? colors.primary : colors.border, backgroundColor: child.ageBand === band ? colors.secondary : "transparent" }]}
                      onPress={() => handleAgeBand(index, band)}
                    >
                      <Text style={[styles.bandText, { color: child.ageBand === band ? colors.primary : colors.mutedForeground, fontFamily: child.ageBand === band ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                        {band}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
            {children.length < 6 && (
              <TouchableOpacity style={[styles.addChildBtn, { borderColor: colors.border }]} onPress={handleAddChild}>
                <Feather name="plus" size={16} color={colors.primary} />
                <Text style={[styles.addChildText, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>Add another child</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={[styles.btn, { backgroundColor: loading ? colors.muted : colors.primary }]} onPress={handleFinish} disabled={loading} activeOpacity={0.85}>
            <Text style={[styles.btnText, { fontFamily: "Inter_700Bold" }]}>{loading ? "Setting up..." : "Let's Go!"}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setStep("family")}>
            <Text style={[styles.skipText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Back</Text>
          </TouchableOpacity>
        </>
      )}

      {step === "done" && (
        <View style={styles.doneWrap}>
          <View style={[styles.doneIcon, { backgroundColor: colors.success + "22" }]}>
            <Feather name="check-circle" size={48} color={colors.success} />
          </View>
          <Text style={[styles.doneTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>You're all set!</Text>
          <Text style={[styles.doneDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Welcome to Digital Village. Your family's safety journey starts now.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24, gap: 24 },
  progressWrap: { flexDirection: "row", gap: 6, height: 4 },
  progressDot: { height: 4, borderRadius: 2 },
  stepHeader: { gap: 10, alignItems: "center", paddingVertical: 8 },
  stepIcon: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  stepTitle: { fontSize: 24, textAlign: "center" },
  stepDesc: { fontSize: 14, textAlign: "center", lineHeight: 21 },
  field: { gap: 8 },
  label: { fontSize: 14 },
  input: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15 },
  btn: { borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  btnText: { color: "#FFFFFF", fontSize: 16 },
  skipText: { textAlign: "center", fontSize: 14, paddingVertical: 4 },
  childrenList: { gap: 10 },
  childRow: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 12 },
  childInputWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  childInput: { flex: 1, fontSize: 15 },
  ageBandRow: { flexDirection: "row", gap: 8 },
  bandBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, alignItems: "center" },
  bandText: { fontSize: 13 },
  addChildBtn: { borderRadius: 14, borderWidth: 1, borderStyle: "dashed", paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
  addChildText: { fontSize: 14 },
  doneWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingVertical: 40 },
  doneIcon: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  doneTitle: { fontSize: 28 },
  doneDesc: { fontSize: 15, textAlign: "center", lineHeight: 22 },
});
