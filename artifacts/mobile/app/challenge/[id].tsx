import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import { useFamily } from "@/context/FamilyContext";
import { CHALLENGES } from "@/data/seed";
import { useColors } from "@/hooks/useColors";

export default function ChallengeDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { progress, startChallenge, completeChallenge, awardBadge } = useFamily();

  const challenge = CHALLENGES.find(c => c.id === id);
  if (!challenge) { router.back(); return null; }

  const isActive = progress.activeChallenges.includes(challenge.id);
  const isComplete = progress.completedChallenges.includes(challenge.id);
  const isLocked = challenge.isPremium && !user?.isPremium;

  const status = isComplete ? "completed" : isActive ? "active" : "available";

  const handleStart = async () => {
    if (isLocked) { router.push("/subscription"); return; }
    await startChallenge(challenge.id);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleComplete = () => {
    Alert.alert("Complete Challenge", `Mark "${challenge.title}" as complete?`, [
      { text: "Not yet", style: "cancel" },
      { text: "Yes, we did it!", onPress: async () => {
        await completeChallenge(challenge.id);
        await awardBadge("b6");
        if (challenge.id === "ch1") await awardBadge("b8");
        if (challenge.id === "ch5") await awardBadge("b9");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }},
    ]);
  };

  const statusColors = { available: colors.primary, active: colors.accent, completed: colors.success };
  const statusColor = statusColors[status];

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={[styles.statusPill, { backgroundColor: statusColor + "22" }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor, fontFamily: "Inter_600SemiBold" }]}>{status === "available" ? "Available" : status === "active" ? "In Progress" : "Complete"}</Text>
        </View>
      </View>

      <View style={[styles.heroCard, { backgroundColor: challenge.color + "18" }]}>
        <View style={[styles.heroIcon, { backgroundColor: challenge.color + "33" }]}>
          <Feather name={challenge.iconName as never} size={36} color={challenge.color} />
        </View>
        <View style={[styles.catPill, { backgroundColor: challenge.color + "33" }]}>
          <Text style={[styles.catText, { color: challenge.color, fontFamily: "Inter_500Medium" }]}>{challenge.category}</Text>
        </View>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{challenge.title}</Text>
        <Text style={[styles.description, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{challenge.description}</Text>
        <View style={styles.meta}>
          <Feather name="clock" size={14} color={colors.mutedForeground} />
          <Text style={[styles.metaText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{challenge.duration}</Text>
          {challenge.isPremium && (
            <View style={[styles.premiumTag, { backgroundColor: colors.accent + "22" }]}>
              <Feather name="star" size={12} color={colors.accent} />
              <Text style={[styles.premiumTagText, { color: colors.accent, fontFamily: "Inter_500Medium" }]}>Premium</Text>
            </View>
          )}
        </View>
      </View>

      <View>
        <Text style={[styles.stepsTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Challenge Steps</Text>
        {challenge.steps.map((step, idx) => (
          <View key={idx} style={[styles.stepRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.stepNum, { backgroundColor: isComplete ? colors.success : challenge.color + "22" }]}>
              {isComplete ? <Feather name="check" size={12} color="#FFFFFF" /> : <Text style={[styles.stepNumText, { color: challenge.color, fontFamily: "Inter_700Bold" }]}>{idx + 1}</Text>}
            </View>
            <Text style={[styles.stepText, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>{step}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.whyCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
        <Text style={[styles.whyTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Why This Matters</Text>
        <Text style={[styles.whyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Family challenges work because they create shared experiences and memories that strengthen your family culture around technology. Research shows families that actively discuss and practice healthy tech habits build more resilient children.
        </Text>
      </View>

      {isLocked && (
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.accent }]} onPress={() => router.push("/subscription")} activeOpacity={0.85}>
          <Feather name="lock" size={18} color="#FFFFFF" />
          <Text style={[styles.actionBtnText, { fontFamily: "Inter_700Bold" }]}>Unlock with Premium</Text>
        </TouchableOpacity>
      )}
      {!isLocked && status === "available" && (
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: challenge.color }]} onPress={handleStart} activeOpacity={0.85}>
          <Feather name="play" size={18} color="#FFFFFF" />
          <Text style={[styles.actionBtnText, { fontFamily: "Inter_700Bold" }]}>Start Challenge</Text>
        </TouchableOpacity>
      )}
      {status === "active" && (
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.success }]} onPress={handleComplete} activeOpacity={0.85}>
          <Feather name="check-circle" size={18} color="#FFFFFF" />
          <Text style={[styles.actionBtnText, { fontFamily: "Inter_700Bold" }]}>Mark as Complete</Text>
        </TouchableOpacity>
      )}
      {status === "completed" && (
        <View style={[styles.completedBanner, { backgroundColor: colors.success + "18", borderColor: colors.success + "44" }]}>
          <Feather name="award" size={22} color={colors.success} />
          <Text style={[styles.completedText, { color: colors.success, fontFamily: "Inter_600SemiBold" }]}>Challenge Complete! Amazing work.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 24 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 13 },
  heroCard: { borderRadius: 20, padding: 20, gap: 12 },
  heroIcon: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  catPill: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  catText: { fontSize: 12 },
  title: { fontSize: 24 },
  description: { fontSize: 14, lineHeight: 21 },
  meta: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaText: { fontSize: 13 },
  premiumTag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  premiumTagText: { fontSize: 12 },
  stepsTitle: { fontSize: 18, marginBottom: 10 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  stepNum: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  stepNumText: { fontSize: 14 },
  stepText: { flex: 1, fontSize: 14, lineHeight: 20, paddingTop: 3 },
  whyCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 8 },
  whyTitle: { fontSize: 15 },
  whyText: { fontSize: 13, lineHeight: 20 },
  actionBtn: { borderRadius: 16, paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 10 },
  actionBtnText: { color: "#FFFFFF", fontSize: 16 },
  completedBanner: { borderRadius: 14, borderWidth: 1, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  completedText: { fontSize: 16 },
});
