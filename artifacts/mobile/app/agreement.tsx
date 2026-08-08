import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useFamily } from "@/context/FamilyContext";
import { AGREEMENT_RULES } from "@/data/seed";
import { AgreementRule } from "@/context/FamilyContext";
import { useColors } from "@/hooks/useColors";
import { useHaptics } from "@/lib/haptics";
import { Badge, Body, Button, Card, Caption, H2, H3, TextField } from "@/components/primitives";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/radius";
import { AGREEMENT_CATEGORY_COLORS } from "@/constants/agreementColors";

export default function AgreementScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { family, agreement, saveAgreement, signAgreement } = useFamily();
  const haptics = useHaptics();

  const initRules: AgreementRule[] = AGREEMENT_RULES.map(r => ({
    id: r.id,
    category: r.category,
    rule: r.rule,
    enabled: agreement?.rules.find(ar => ar.id === r.id)?.enabled ?? true,
  }));

  const [rules, setRules] = useState<AgreementRule[]>(agreement?.rules ?? initRules);
  const [customRules, setCustomRules] = useState<string[]>(agreement?.customRules ?? []);
  const [newRule, setNewRule] = useState("");
  const [step, setStep] = useState<"edit" | "sign">(agreement?.signedAt ? "sign" : "edit");
  const [signed, setSigned] = useState(!!agreement?.signedAt);

  const categories = [...new Set(rules.map(r => r.category))];

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const addCustomRule = () => {
    if (!newRule.trim()) return;
    setCustomRules([...customRules, newRule.trim()]);
    setNewRule("");
  };

  const removeCustomRule = (idx: number) => {
    setCustomRules(customRules.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    try {
      await saveAgreement(rules, customRules);
      setStep("sign");
    } catch (e: any) {
      console.error("[agreement] save failed:", e?.message || e);
      Alert.alert("Error", "Failed to save agreement. Please try again.");
    }
  };

  const handleSign = async () => {
    try {
      await signAgreement();
      setSigned(true);
      await haptics.notify(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      console.error("[agreement] sign failed:", e?.message || e);
      Alert.alert("Error", "Failed to sign agreement. Please try again.");
    }
  };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xxl }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <H3 style={{ marginBottom: 0 }}>Family Agreement</H3>
        <View style={{ width: 22 }} />
      </View>

      {step === "edit" && (
        <>
          <Card variant="flat" style={[styles.intro, { backgroundColor: colors.secondary }]}>
            <Feather name="info" size={16} color={colors.primary} />
            <Body color={colors.foreground} style={styles.introText}>
              Select the rules that apply to your family. You can also add your own. Build this together — kids are more likely to follow rules they helped create.
            </Body>
          </Card>

          {categories.map(category => (
            <View key={category}>
              <View style={styles.categoryHeader}>
                <View style={[styles.categoryDot, { backgroundColor: AGREEMENT_CATEGORY_COLORS[category] ?? colors.primary }]} />
                <H3 style={{ marginBottom: 0 }}>{category}</H3>
              </View>
              {rules.filter(r => r.category === category).map(rule => (
                <TouchableOpacity
                  key={rule.id}
                  style={[styles.ruleRow, { backgroundColor: colors.card, borderColor: rule.enabled ? colors.primary + "44" : colors.border }]}
                  onPress={() => toggleRule(rule.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkbox, { borderColor: rule.enabled ? colors.primary : colors.border, backgroundColor: rule.enabled ? colors.primary : "transparent" }]}>
                    {rule.enabled && <Feather name="check" size={12} color={colors.primaryForeground} />}
                  </View>
                  <Body color={colors.foreground} style={styles.ruleText}>{rule.rule}</Body>
                </TouchableOpacity>
              ))}
            </View>
          ))}

          <View>
            <H3 style={{ marginBottom: spacing.sm }}>Custom Rules</H3>
            {customRules.map((r, idx) => (
              <View key={idx} style={[styles.ruleRow, { backgroundColor: colors.card, borderColor: colors.primary + "44" }]}>
                <View style={[styles.checkbox, { borderColor: colors.primary, backgroundColor: colors.primary }]}>
                  <Feather name="check" size={12} color={colors.primaryForeground} />
                </View>
                <Body color={colors.foreground} style={[styles.ruleText, { flex: 1 }]}>{r}</Body>
                <TouchableOpacity onPress={() => removeCustomRule(idx)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name="x" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            ))}
            <TextField
              placeholder="Add your own rule..."
              value={newRule}
              onChangeText={setNewRule}
              onSubmitEditing={addCustomRule}
              rightElement={
                <TouchableOpacity onPress={addCustomRule} disabled={!newRule.trim()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name="plus-circle" size={22} color={newRule.trim() ? colors.primary : colors.mutedForeground} />
                </TouchableOpacity>
              }
            />
          </View>

          <Button title="Save & Preview Agreement" onPress={handleSave} />
        </>
      )}

      {step === "sign" && (
        <>
          <Card variant="outline" style={styles.agreementDoc}>
            <H2 style={{ textAlign: "center", marginBottom: 0 }}>{family?.name ?? "Our Family"} Technology Agreement</H2>
            <Caption color={colors.mutedForeground} style={{ textAlign: "center" }}>Created {new Date().toLocaleDateString()}</Caption>
            <View style={[styles.docSeparator, { backgroundColor: colors.border }]} />
            <Body color={colors.foreground} style={styles.docIntro}>
              We, as a family, agree to follow these rules when using technology. These rules help keep everyone safe, respectful, and connected to each other.
            </Body>
            {rules.filter(r => r.enabled).map(rule => (
              <View key={rule.id} style={styles.docRule}>
                <Feather name="check" size={14} color={AGREEMENT_CATEGORY_COLORS[rule.category] ?? colors.primary} />
                <Body color={colors.foreground} style={styles.docRuleText}>{rule.rule}</Body>
              </View>
            ))}
            {customRules.map((r, idx) => (
              <View key={`c${idx}`} style={styles.docRule}>
                <Feather name="check" size={14} color={colors.primary} />
                <Body color={colors.foreground} style={styles.docRuleText}>{r}</Body>
              </View>
            ))}
            <View style={[styles.docSeparator, { backgroundColor: colors.border }]} />
            {signed ? (
              <Badge label={`Signed by ${family?.name ?? "Family"} · ${agreement?.signedAt ? new Date(agreement.signedAt).toLocaleDateString() : "Today"}`} tone={colors.success} variant="soft" icon="check-circle" />
            ) : (
              <Caption color={colors.mutedForeground}>
                Review the agreement with your family, then sign below to make it official.
              </Caption>
            )}
          </Card>

          {!signed && (
            <Button title="Sign Agreement" icon="edit-3" style={{ backgroundColor: colors.success }} onPress={handleSign} />
          )}

          <Button title="Edit Rules" variant="outline" onPress={() => setStep("edit")} />

          {signed && <Button title="Done" onPress={() => router.back()} />}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl, gap: spacing.xl },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  intro: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  introText: { flex: 1, lineHeight: 19 },
  categoryHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  categoryDot: { width: 8, height: 8, borderRadius: 4 },
  ruleRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.xs },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center", marginTop: 1, flexShrink: 0 },
  ruleText: { lineHeight: 20 },
  agreementDoc: { gap: spacing.md },
  docSeparator: { height: 1 },
  docIntro: { lineHeight: 21, fontStyle: "italic" },
  docRule: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  docRuleText: { flex: 1, lineHeight: 20 },
});
