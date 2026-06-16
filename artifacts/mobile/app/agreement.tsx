import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFamily } from "@/context/FamilyContext";
import { AGREEMENT_RULES } from "@/data/seed";
import { AgreementRule } from "@/context/FamilyContext";
import { useColors } from "@/hooks/useColors";

const CATEGORY_COLORS: Record<string, string> = { Time: "#F5A623", Safety: "#4A90A4", Privacy: "#7B5EA7", Respect: "#4CAF7D", Devices: "#E07B39" };

export default function AgreementScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { family, agreement, saveAgreement, signAgreement } = useFamily();

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
    await saveAgreement(rules, customRules);
    setStep("sign");
  };

  const handleSign = async () => {
    await signAgreement();
    setSigned(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.pageTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Family Agreement</Text>
        <View style={{ width: 22 }} />
      </View>

      {step === "edit" && (
        <>
          <View style={[styles.intro, { backgroundColor: colors.secondary }]}>
            <Feather name="info" size={16} color={colors.primary} />
            <Text style={[styles.introText, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
              Select the rules that apply to your family. You can also add your own. Build this together — kids are more likely to follow rules they helped create.
            </Text>
          </View>

          {categories.map(category => (
            <View key={category}>
              <View style={styles.categoryHeader}>
                <View style={[styles.categoryDot, { backgroundColor: CATEGORY_COLORS[category] ?? colors.primary }]} />
                <Text style={[styles.categoryTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{category}</Text>
              </View>
              {rules.filter(r => r.category === category).map(rule => (
                <TouchableOpacity
                  key={rule.id}
                  style={[styles.ruleRow, { backgroundColor: colors.card, borderColor: rule.enabled ? colors.primary + "44" : colors.border }]}
                  onPress={() => toggleRule(rule.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkbox, { borderColor: rule.enabled ? colors.primary : colors.border, backgroundColor: rule.enabled ? colors.primary : "transparent" }]}>
                    {rule.enabled && <Feather name="check" size={12} color="#FFFFFF" />}
                  </View>
                  <Text style={[styles.ruleText, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>{rule.rule}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}

          <View>
            <Text style={[styles.categoryTitle, { color: colors.foreground, fontFamily: "Inter_700Bold", marginBottom: 8 }]}>Custom Rules</Text>
            {customRules.map((r, idx) => (
              <View key={idx} style={[styles.ruleRow, { backgroundColor: colors.card, borderColor: colors.primary + "44" }]}>
                <View style={[styles.checkbox, { borderColor: colors.primary, backgroundColor: colors.primary }]}>
                  <Feather name="check" size={12} color="#FFFFFF" />
                </View>
                <Text style={[styles.ruleText, { color: colors.foreground, fontFamily: "Inter_400Regular", flex: 1 }]}>{r}</Text>
                <TouchableOpacity onPress={() => removeCustomRule(idx)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name="x" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            ))}
            <View style={[styles.customInputRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TextInput
                style={[styles.customInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                placeholder="Add your own rule..."
                placeholderTextColor={colors.mutedForeground}
                value={newRule}
                onChangeText={setNewRule}
                onSubmitEditing={addCustomRule}
              />
              <TouchableOpacity onPress={addCustomRule} disabled={!newRule.trim()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="plus-circle" size={22} color={newRule.trim() ? colors.primary : colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave} activeOpacity={0.85}>
            <Text style={[styles.saveBtnText, { fontFamily: "Inter_700Bold" }]}>Save & Preview Agreement</Text>
          </TouchableOpacity>
        </>
      )}

      {step === "sign" && (
        <>
          <View style={[styles.agreementDoc, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.docTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{family?.name ?? "Our Family"} Technology Agreement</Text>
            <Text style={[styles.docDate, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Created {new Date().toLocaleDateString()}</Text>
            <View style={[styles.docSeparator, { backgroundColor: colors.border }]} />
            <Text style={[styles.docIntro, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
              We, as a family, agree to follow these rules when using technology. These rules help keep everyone safe, respectful, and connected to each other.
            </Text>
            {rules.filter(r => r.enabled).map(rule => (
              <View key={rule.id} style={styles.docRule}>
                <Feather name="check" size={14} color={CATEGORY_COLORS[rule.category] ?? colors.primary} />
                <Text style={[styles.docRuleText, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>{rule.rule}</Text>
              </View>
            ))}
            {customRules.map((r, idx) => (
              <View key={`c${idx}`} style={styles.docRule}>
                <Feather name="check" size={14} color={colors.primary} />
                <Text style={[styles.docRuleText, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>{r}</Text>
              </View>
            ))}
            <View style={[styles.docSeparator, { backgroundColor: colors.border }]} />
            {signed ? (
              <View style={[styles.signedBanner, { backgroundColor: colors.success + "22" }]}>
                <Feather name="check-circle" size={18} color={colors.success} />
                <Text style={[styles.signedText, { color: colors.success, fontFamily: "Inter_600SemiBold" }]}>Signed by {family?.name ?? "Family"} · {agreement?.signedAt ? new Date(agreement.signedAt).toLocaleDateString() : "Today"}</Text>
              </View>
            ) : (
              <Text style={[styles.signPrompt, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                Review the agreement with your family, then sign below to make it official.
              </Text>
            )}
          </View>

          {!signed && (
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.success }]} onPress={handleSign} activeOpacity={0.85}>
              <Feather name="edit-3" size={18} color="#FFFFFF" />
              <Text style={[styles.saveBtnText, { fontFamily: "Inter_700Bold" }]}>Sign Agreement</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.editBtn, { borderColor: colors.border }]} onPress={() => setStep("edit")}>
            <Text style={[styles.editBtnText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Edit Rules</Text>
          </TouchableOpacity>

          {signed && (
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={() => router.back()} activeOpacity={0.85}>
              <Text style={[styles.saveBtnText, { fontFamily: "Inter_700Bold" }]}>Done</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pageTitle: { fontSize: 20 },
  intro: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 14, alignItems: "flex-start" },
  introText: { flex: 1, fontSize: 13, lineHeight: 19 },
  categoryHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  categoryDot: { width: 8, height: 8, borderRadius: 4 },
  categoryTitle: { fontSize: 16 },
  ruleRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 6 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center", marginTop: 1, flexShrink: 0 },
  ruleText: { flex: 1, fontSize: 14, lineHeight: 20 },
  customInputRow: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  customInput: { flex: 1, fontSize: 14 },
  saveBtn: { borderRadius: 16, paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
  saveBtnText: { color: "#FFFFFF", fontSize: 16 },
  agreementDoc: { borderRadius: 16, borderWidth: 1, padding: 20, gap: 12 },
  docTitle: { fontSize: 18, textAlign: "center" },
  docDate: { fontSize: 12, textAlign: "center" },
  docSeparator: { height: 1 },
  docIntro: { fontSize: 14, lineHeight: 21, fontStyle: "italic" },
  docRule: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  docRuleText: { flex: 1, fontSize: 14, lineHeight: 20 },
  signedBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10 },
  signedText: { fontSize: 14 },
  signPrompt: { fontSize: 13, lineHeight: 19 },
  editBtn: { borderRadius: 14, borderWidth: 1, paddingVertical: 14, alignItems: "center" },
  editBtnText: { fontSize: 15 },
});
