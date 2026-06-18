import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import { useFamily } from "@/context/FamilyContext";
import { AGE_BANDS, AgeBand } from "@/data/seed";
import ChildCard from "@/components/ChildCard";
import { SectionHeader } from "@/components/UI";
import { useColors } from "@/hooks/useColors";

export default function FamilyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { family, agreement } = useFamily();
  const [addingChild, setAddingChild] = useState(false);
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState<AgeBand>("10-13");
  const { addChild } = useFamily();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const handleAddChild = async () => {
    if (!childName.trim()) { Alert.alert("Name Required", "Please enter a name for this child."); return; }
    if (!user) return;
    try {
      await addChild(childName.trim(), childAge, user.familyId);
      setChildName("");
      setChildAge("10-13");
      setAddingChild(false);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      console.error("[family] addChild error:", e?.message || e);
      Alert.alert("Error", "Failed to add child. Please try again.");
    }
  };

  const agreementStatus = agreement?.signedAt ? "Signed" : agreement ? "Draft" : "Not Created";
  const agreementColor = agreement?.signedAt ? colors.success : agreement ? colors.accent : colors.mutedForeground;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: bottomPad + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
        {family?.name ?? "My Family"}
      </Text>

      <View>
        <SectionHeader title="Children" action="Add child" onAction={() => setAddingChild(true)} />
        {family?.children.length === 0 && !addingChild && (
          <TouchableOpacity
            style={[styles.emptyChildBtn, { borderColor: colors.primary + "44", backgroundColor: colors.secondary }]}
            onPress={() => setAddingChild(true)}
          >
            <Feather name="user-plus" size={20} color={colors.primary} />
            <Text style={[styles.emptyChildText, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>Add your first child</Text>
          </TouchableOpacity>
        )}
        {family?.children.map(child => (
          <ChildCard
            key={child.id}
            child={child}
            onPress={() => router.push({ pathname: "/child/[id]", params: { id: child.id } })}
          />
        ))}

        {addingChild && (
          <View style={[styles.addChildCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
            <TextInput
              style={[styles.childInput, { color: colors.foreground, borderColor: colors.border, fontFamily: "Inter_400Regular" }]}
              placeholder="Child's name"
              placeholderTextColor={colors.mutedForeground}
              value={childName}
              onChangeText={setChildName}
              autoFocus
              autoCapitalize="words"
            />
            <Text style={[styles.ageLabel, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Age Band</Text>
            <View style={styles.ageBandRow}>
              {AGE_BANDS.map(band => (
                <TouchableOpacity
                  key={band}
                  style={[styles.bandBtn, { borderColor: childAge === band ? colors.primary : colors.border, backgroundColor: childAge === band ? colors.secondary : "transparent" }]}
                  onPress={() => setChildAge(band)}
                >
                  <Text style={[styles.bandText, { color: childAge === band ? colors.primary : colors.mutedForeground, fontFamily: childAge === band ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                    Ages {band}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.addBtns}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => { setAddingChild(false); setChildName(""); }}>
                <Text style={[styles.cancelText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: colors.primary }]} onPress={handleAddChild}>
                <Text style={[styles.confirmText, { fontFamily: "Inter_600SemiBold" }]}>Add Child</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <View>
        <SectionHeader title="Family Agreement" />
        <TouchableOpacity
          style={[styles.agreementCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push("/agreement")}
          activeOpacity={0.8}
        >
          <View style={[styles.agreeIcon, { backgroundColor: colors.secondary }]}>
            <Feather name="file-text" size={22} color={colors.primary} />
          </View>
          <View style={styles.agreeContent}>
            <Text style={[styles.agreeTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Technology Agreement</Text>
            <Text style={[styles.agreeDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Build shared rules and get everyone on the same page about device use.</Text>
            <View style={[styles.statusPill, { backgroundColor: agreementColor + "22" }]}>
              <View style={[styles.statusDot, { backgroundColor: agreementColor }]} />
              <Text style={[styles.statusText, { color: agreementColor, fontFamily: "Inter_500Medium" }]}>{agreementStatus}</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <View>
        <SectionHeader title="Privacy & Safety" />
        {[
          { icon: "shield" as const, title: "Our Approach", desc: "Digital Village does not monitor, track, or spy on children's devices. We build safety through education and conversation.", color: colors.success },
          { icon: "eye-off" as const, title: "No Surveillance", desc: "No iMessage reading, no keystroke logging, no unauthorized photo access, no background recording.", color: colors.info },
          { icon: "lock" as const, title: "Data Privacy", desc: "All family data stays on your device. We don't sell or share your information.", color: colors.accent },
        ].map(item => (
          <View key={item.title} style={[styles.privacyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.privacyIcon, { backgroundColor: item.color + "22" }]}>
              <Feather name={item.icon} size={18} color={item.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.privacyTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{item.title}</Text>
              <Text style={[styles.privacyDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{item.desc}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 24 },
  pageTitle: { fontSize: 28 },
  emptyChildBtn: { borderRadius: 14, borderWidth: 1.5, borderStyle: "dashed", paddingVertical: 20, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 10 },
  emptyChildText: { fontSize: 15 },
  addChildCard: { borderRadius: 16, borderWidth: 1.5, padding: 16, gap: 12 },
  childInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  ageLabel: { fontSize: 14 },
  ageBandRow: { flexDirection: "row", gap: 8 },
  bandBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, alignItems: "center" },
  bandText: { fontSize: 13 },
  addBtns: { flexDirection: "row", gap: 10 },
  cancelBtn: { flex: 1, borderRadius: 12, borderWidth: 1, paddingVertical: 12, alignItems: "center" },
  cancelText: { fontSize: 14 },
  confirmBtn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  confirmText: { color: "#FFFFFF", fontSize: 14 },
  agreementCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 16, borderWidth: 1 },
  agreeIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  agreeContent: { flex: 1, gap: 6 },
  agreeTitle: { fontSize: 16 },
  agreeDesc: { fontSize: 13, lineHeight: 18 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12 },
  privacyCard: { flexDirection: "row", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8, alignItems: "flex-start" },
  privacyIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  privacyTitle: { fontSize: 14, marginBottom: 2 },
  privacyDesc: { fontSize: 13, lineHeight: 18 },
});
