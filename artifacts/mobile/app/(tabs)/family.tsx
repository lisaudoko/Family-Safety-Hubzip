import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import { useFamily } from "@/context/FamilyContext";
import { AGE_BANDS, AgeBand } from "@/data/seed";
import ChildCard from "@/components/ChildCard";
import { MonitoringPanel } from "@/components/MonitoringPanel";
import { SectionHeader } from "@/components/UI";
import { useColors } from "@/hooks/useColors";
import { useHaptics } from "@/lib/haptics";

export default function FamilyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isParent = user?.role === "parent";
  const { family, agreement } = useFamily();
  const [addingChild, setAddingChild] = useState(false);
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState<AgeBand>("10-13");
  const { addChild } = useFamily();
  const haptics = useHaptics();
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, []),
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const handleAddChild = async () => {
    if (!childName.trim()) { Alert.alert("Name Required", "Please enter a name for this child."); return; }
    if (!user) return;
    try {
      const name = childName.trim();
      const pin = await addChild(name, childAge, user.familyId);
      setChildName("");
      setChildAge("10-13");
      setAddingChild(false);
      await haptics.notify(Haptics.NotificationFeedbackType.Success);
      if (pin) {
        Alert.alert(
          "Login PIN Created",
          `${name} can log in on their own device with the family code${family?.familyCode ? ` (${family.familyCode})` : ""} and this PIN: ${pin}\n\nYou can change it anytime from ${name}'s profile.`,
        );
      }
    } catch (e: any) {
      console.error("[family] addChild error:", e?.message || e);
      Alert.alert("Error", "Failed to add child. Please try again.");
    }
  };

  const agreementStatus = agreement?.signedAt ? "Signed" : agreement ? "Draft" : "Not Created";
  const agreementColor = agreement?.signedAt ? colors.success : agreement ? colors.accent : colors.mutedForeground;
  const parents = family?.parents ?? [];
  const siblings = family?.siblings ?? [];
  const children = family?.children ?? [];
  
  return (
    <ScrollView
      ref={scrollRef}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: bottomPad + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
        {family?.name ?? "My Family"}
      </Text>

      {isParent && family?.familyCode && (
        <View style={[styles.codeCard, { backgroundColor: colors.secondary, borderColor: colors.primary + "33" }]}>
          <View style={[styles.codeIcon, { backgroundColor: colors.card }]}>
            <Feather name="key" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.codeLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Family Code</Text>
            <Text style={[styles.codeValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{family.familyCode}</Text>
          </View>
          <Text style={[styles.codeHint, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Share with your kids so they can log in
          </Text>
        </View>
      )}

      <View>

  {isParent ? (
    <>
      <SectionHeader
        title="Children"
        action="Add child"
        onAction={() => setAddingChild(true)}
      />

      {children.length === 0 && !addingChild && (
        <TouchableOpacity
          style={[
            styles.emptyChildBtn,
            {
              borderColor: colors.primary + "44",
              backgroundColor: colors.secondary,
            },
          ]}
          onPress={() => setAddingChild(true)}
        >
          <Feather name="user-plus" size={20} color={colors.primary} />
          <Text
            style={[
              styles.emptyChildText,
              {
                color: colors.primary,
                fontFamily: "Inter_500Medium",
              },
            ]}
          >
            Add your first child
          </Text>
        </TouchableOpacity>
      )}

      {children.map((child) => (
        <ChildCard
          key={child.id}
          child={child}
          onPress={() =>
            router.push({
              pathname: "/child/[id]",
              params: { id: child.id },
            })
          }
        />
      ))}

      {addingChild && (
        <View style={[styles.addChildCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.childInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.secondary }]}
            placeholder="Child's name"
            placeholderTextColor={colors.mutedForeground}
            value={childName}
            onChangeText={setChildName}
          />
          <Text style={[styles.ageLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Age group</Text>
          <View style={styles.ageBandRow}>
            {AGE_BANDS.map((band) => (
              <TouchableOpacity
                key={band}
                style={[
                  styles.bandBtn,
                  {
                    borderColor: childAge === band ? colors.primary : colors.border,
                    backgroundColor: childAge === band ? colors.primary + "22" : "transparent",
                  },
                ]}
                onPress={() => setChildAge(band)}
              >
                <Text
                  style={[
                    styles.bandText,
                    { color: childAge === band ? colors.primary : colors.mutedForeground, fontFamily: "Inter_500Medium" },
                  ]}
                >
                  {band}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.addBtns}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              onPress={() => {
                setAddingChild(false);
                setChildName("");
                setChildAge("10-13");
              }}
            >
              <Text style={[styles.cancelText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
              onPress={handleAddChild}
            >
              <Text style={[styles.confirmText, { fontFamily: "Inter_600SemiBold" }]}>Add Child</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </>
  ) : (
    <>
      <SectionHeader title="Parents" />

      {parents.map((parent) => (
        <View
          key={parent.id}
          style={[
            styles.agreementCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.agreeIcon,
              { backgroundColor: colors.secondary },
            ]}
          >
            <Feather
              name="user"
              size={20}
              color={colors.primary}
            />
          </View>

          <View style={styles.agreeContent}>
            <Text
              style={[
                styles.agreeTitle,
                {
                  color: colors.foreground,
                  fontFamily: "Inter_700Bold",
                },
              ]}
            >
              {parent.name}
            </Text>

            <Text
              style={[
                styles.agreeDesc,
                {
                  color: colors.mutedForeground,
                  fontFamily: "Inter_400Regular",
                },
              ]}
            >
              Parent
            </Text>
          </View>
        </View>
      ))}

      <SectionHeader title="Siblings" />

      {siblings.length === 0 ? (
        <Text
          style={{
            color: colors.mutedForeground,
            textAlign: "center",
          }}
        >
          No siblings found.
        </Text>
      ) : (
        siblings.map((child) => (
          <ChildCard
            key={child.id}
            child={child}
            onPress={() => {}}
          />
        ))
      )}
    </>
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

      {isParent && (
        <View>
          <SectionHeader title="Monitoring" />
          <MonitoringPanel />
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 24 },
  pageTitle: { fontSize: 28 },
  codeCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, marginTop: -12 },
  codeIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  codeLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  codeValue: { fontSize: 18, letterSpacing: 2 },
  codeHint: { fontSize: 11, maxWidth: 90, textAlign: "right" },
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
});
