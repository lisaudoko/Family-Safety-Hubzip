import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useAuth } from "@/context/AuthContext";
import { useFamily } from "@/context/FamilyContext";
import { useColors } from "@/hooks/useColors";
import { AGE_BANDS, AgeBand } from "@/data/seed";
import { useHaptics } from "@/lib/haptics";
import { Body, Button, Card, Caption, H1, Label, SegmentedControl, TextField } from "@/components/primitives";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/radius";

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
  const ageBandSegments = AGE_BANDS.map(b => ({ key: b, label: b }));

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xxxl }]}
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
            <H1 style={styles.stepTitle}>Name your family</H1>
            <Body color={colors.mutedForeground} style={styles.stepDesc}>
              This appears in your Family Dashboard and Technology Agreement.
            </Body>
          </View>
          <TextField
            label="Family Name"
            placeholder={user?.name ? `The ${user.name} Family` : "The Smith Family"}
            value={familyName}
            onChangeText={setFamilyName}
            autoCapitalize="words"
          />
          <Button title="Continue" onPress={handleFamilyNext} />
          <TouchableOpacity onPress={async () => { await completeOnboarding(); router.replace("/(tabs)"); }}>
            <Body color={colors.mutedForeground} style={styles.skipText}>Skip for now</Body>
          </TouchableOpacity>
        </>
      )}

      {step === "children" && (
        <>
          <View style={styles.stepHeader}>
            <View style={[styles.stepIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="users" size={28} color={colors.primary} />
            </View>
            <H1 style={styles.stepTitle}>Add your children</H1>
            <Body color={colors.mutedForeground} style={styles.stepDesc}>
              We use age bands to personalize content — no exact ages stored.
            </Body>
          </View>

          <View style={styles.childrenList}>
            {children.map((child, index) => (
              <Card key={index} variant="outline" style={styles.childRow}>
                <View style={styles.childInputWrap}>
                  <TextField
                    containerStyle={{ flex: 1 }}
                    placeholder={`Child ${index + 1} name`}
                    value={child.name}
                    onChangeText={(t) => handleChildName(index, t)}
                    autoCapitalize="words"
                  />
                  {children.length > 1 && (
                    <TouchableOpacity onPress={() => handleRemoveChild(index)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.removeBtn}>
                      <Feather name="x" size={16} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  )}
                </View>
                <Label>Age band</Label>
                <SegmentedControl segments={ageBandSegments} value={child.ageBand} onChange={(v) => handleAgeBand(index, v)} />
              </Card>
            ))}
            {children.length < 6 && (
              <TouchableOpacity style={[styles.addChildBtn, { borderColor: colors.border }]} onPress={handleAddChild}>
                <Feather name="plus" size={16} color={colors.primary} />
                <Caption color={colors.primary}>Add another child</Caption>
              </TouchableOpacity>
            )}
          </View>

          <Button title={loading ? "Setting up..." : "Let's Go!"} onPress={handleFinish} loading={loading} disabled={loading} />
          <TouchableOpacity onPress={() => setStep("family")}>
            <Body color={colors.mutedForeground} style={styles.skipText}>Back</Body>
          </TouchableOpacity>
        </>
      )}

      {step === "done" && (
        <View style={styles.doneWrap}>
          <View style={[styles.doneIcon, { backgroundColor: colors.success + "22" }]}>
            <Feather name="check-circle" size={48} color={colors.success} />
          </View>
          <H1 style={styles.doneTitle}>You&apos;re all set!</H1>
          <Body color={colors.mutedForeground} style={styles.doneDesc}>
            Welcome to Digital Village. Your family&apos;s safety journey starts now.
          </Body>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: spacing.xxl, gap: spacing.xxl },
  progressWrap: { flexDirection: "row", gap: spacing.xs, height: 4 },
  progressDot: { height: 4, borderRadius: 2 },
  stepHeader: { gap: spacing.sm, alignItems: "center", paddingVertical: spacing.sm },
  stepIcon: { width: 64, height: 64, borderRadius: radius.xl, alignItems: "center", justifyContent: "center" },
  stepTitle: { textAlign: "center" },
  stepDesc: { textAlign: "center" },
  skipText: { textAlign: "center", paddingVertical: spacing.xs },
  childrenList: { gap: spacing.md },
  childRow: { gap: spacing.md },
  childInputWrap: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
  removeBtn: { paddingBottom: spacing.md },
  addChildBtn: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    paddingVertical: spacing.md,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
  },
  doneWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.lg, paddingVertical: spacing.xxxl + 8 },
  doneIcon: { width: 100, height: 100, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  doneTitle: { textAlign: "center" },
  doneDesc: { textAlign: "center" },
});
