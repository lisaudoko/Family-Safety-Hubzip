import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useAuth } from "@/context/AuthContext";
import { useFamily } from "@/context/FamilyContext";
import { AGE_BANDS, AgeBand } from "@/data/seed";
import ChildCard from "@/components/ChildCard";
import { MonitoringPanel } from "@/components/MonitoringPanel";
import { Badge, Body, Button, Card, Caption, H1, H2, SectionHeader, SegmentedControl, TextField } from "@/components/primitives";
import { useColors } from "@/hooks/useColors";
import { useHaptics } from "@/lib/haptics";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/radius";

const AGE_BAND_SEGMENTS = AGE_BANDS.map(b => ({ key: b, label: b }));

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
      contentContainerStyle={[styles.content, { paddingTop: topPad + spacing.lg, paddingBottom: bottomPad + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <H1>{family?.name ?? "My Family"}</H1>

      {isParent && family?.familyCode && (
        <Card variant="flat" style={[styles.codeCard, { backgroundColor: colors.secondary }]}>
          <View style={[styles.codeIcon, { backgroundColor: colors.card }]}>
            <Feather name="key" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Caption color={colors.mutedForeground} style={styles.codeLabel}>FAMILY CODE</Caption>
            <H2 style={styles.codeValue}>{family.familyCode}</H2>
          </View>
          <Caption color={colors.mutedForeground} style={styles.codeHint}>Share with your kids so they can log in</Caption>
        </Card>
      )}

      <View style={styles.section}>
        {isParent ? (
          <>
            <SectionHeader title="Children" action="Add child" onAction={() => setAddingChild(true)} />

            {children.length === 0 && !addingChild && (
              <TouchableOpacity
                style={[styles.emptyChildBtn, { borderColor: colors.primary + "44", backgroundColor: colors.secondary }]}
                onPress={() => setAddingChild(true)}
              >
                <Feather name="user-plus" size={20} color={colors.primary} />
                <Body color={colors.primary}>Add your first child</Body>
              </TouchableOpacity>
            )}

            {children.map((child) => (
              <ChildCard
                key={child.id}
                child={child}
                onPress={() => router.push({ pathname: "/child/[id]", params: { id: child.id } })}
              />
            ))}

            {addingChild && (
              <Card variant="outline" style={styles.addChildCard}>
                <TextField placeholder="Child's name" value={childName} onChangeText={setChildName} />
                <Caption color={colors.mutedForeground}>Age group</Caption>
                <SegmentedControl segments={AGE_BAND_SEGMENTS} value={childAge} onChange={setChildAge} />
                <View style={styles.addBtns}>
                  <Button
                    title="Cancel"
                    variant="outline"
                    style={{ flex: 1 }}
                    onPress={() => {
                      setAddingChild(false);
                      setChildName("");
                      setChildAge("10-13");
                    }}
                  />
                  <Button title="Add Child" style={{ flex: 1 }} onPress={handleAddChild} />
                </View>
              </Card>
            )}
          </>
        ) : (
          <>
            <SectionHeader title="Parents" />
            {parents.map((parent) => (
              <Card key={parent.id} variant="outline" style={styles.agreementCard}>
                <View style={[styles.agreeIcon, { backgroundColor: colors.secondary }]}>
                  <Feather name="user" size={20} color={colors.primary} />
                </View>
                <View style={styles.agreeContent}>
                  <Body color={colors.foreground}>{parent.name}</Body>
                  <Caption color={colors.mutedForeground}>Parent</Caption>
                </View>
              </Card>
            ))}

            <SectionHeader title="Siblings" />
            {siblings.length === 0 ? (
              <Body color={colors.mutedForeground} style={{ textAlign: "center" }}>No siblings found.</Body>
            ) : (
              siblings.map((child) => <ChildCard key={child.id} child={child} onPress={() => {}} />)
            )}
          </>
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader title="Family Agreement" />
        <Card variant="outline" pressable onPress={() => router.push("/agreement")} style={styles.agreementCard}>
          <View style={[styles.agreeIcon, { backgroundColor: colors.secondary }]}>
            <Feather name="file-text" size={22} color={colors.primary} />
          </View>
          <View style={styles.agreeContent}>
            <Body color={colors.foreground}>Technology Agreement</Body>
            <Caption color={colors.mutedForeground}>Build shared rules and get everyone on the same page about device use.</Caption>
            <Badge label={agreementStatus} tone={agreementColor} variant="soft" />
          </View>
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        </Card>
      </View>

      {isParent && (
        <View style={styles.section}>
          <SectionHeader title="Family Defaults" />
          <Card variant="outline" pressable onPress={() => router.push("/family-policy")} style={styles.agreementCard}>
            <View style={[styles.agreeIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="sliders" size={22} color={colors.primary} />
            </View>
            <View style={styles.agreeContent}>
              <Body color={colors.foreground}>Screen Time & Restrictions</Body>
              <Caption color={colors.mutedForeground}>Set default screen time, bedtime, and content rules for every child.</Caption>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </Card>
        </View>
      )}

      {isParent && (
        <View style={styles.section}>
          <SectionHeader title="Monitoring" />
          <MonitoringPanel />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl, gap: spacing.xxl },
  section: { gap: spacing.md },
  codeCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: -spacing.md },
  codeIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  codeLabel: { letterSpacing: 0.5 },
  codeValue: { letterSpacing: 2 },
  codeHint: { maxWidth: 90, textAlign: "right" },
  emptyChildBtn: { borderRadius: radius.lg, borderWidth: 1.5, borderStyle: "dashed", paddingVertical: spacing.xl, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: spacing.sm },
  addChildCard: { gap: spacing.md },
  addBtns: { flexDirection: "row", gap: spacing.sm },
  agreementCard: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  agreeIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  agreeContent: { flex: 1, gap: spacing.xs },
});
