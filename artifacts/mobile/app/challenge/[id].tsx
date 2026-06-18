import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import { useFamily } from "@/context/FamilyContext";
import { CHALLENGES } from "@/data/seed";
import { useColors } from "@/hooks/useColors";

function StepRing({ done, total, color, size = 60 }: { done: number; total: number; color: string; size?: number }) {
  const colors = useColors();
  const pct = total > 0 ? done / total : 0;
  const ringColor = pct >= 1 ? colors.success : color;
  return (
    <View style={[styles.ring, { width: size, height: size, borderRadius: size / 2, borderColor: ringColor, backgroundColor: ringColor + "14" }]}>
      <Text style={[styles.ringCount, { color: ringColor, fontFamily: "Inter_700Bold", fontSize: size * 0.3 }]}>{done}/{total}</Text>
    </View>
  );
}

export default function ChallengeDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { progress, startChallenge, completeChallengeStep, awardBadge } = useFamily();

  const challenge = CHALLENGES.find(c => c.id === id);
  if (!challenge) { router.back(); return null; }

  const isActive = progress.activeChallenges.includes(challenge.id);
  const isComplete = progress.completedChallenges.includes(challenge.id);
  const isLocked = challenge.isPremium && !user?.isPremium;

  const status = isComplete ? "completed" : isActive ? "active" : "available";
  const totalSteps = challenge.steps.length;
  const completedSteps = progress.challengeSteps[challenge.id] ?? [];
  const isStepDone = (idx: number) => isComplete || completedSteps.includes(idx);
  const doneCount = isComplete ? totalSteps : completedSteps.length;

  const handleStart = async () => {
    if (isLocked) { router.push("/subscription"); return; }
    await startChallenge(challenge.id);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleToggleStep = async (idx: number) => {
    if (!isActive) return;
    const justCompleted = await completeChallengeStep(challenge.id, idx, totalSteps);
    if (justCompleted) {
      await awardBadge("b6");
      if (challenge.id === "ch1") await awardBadge("b8");
      if (challenge.id === "ch5") await awardBadge("b9");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
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

      {(isActive || isComplete) && (
        <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <StepRing done={doneCount} total={totalSteps} color={challenge.color} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.progressTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              {isComplete ? "All steps complete!" : `${doneCount} of ${totalSteps} steps done`}
            </Text>
            <Text style={[styles.progressSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {isComplete ? "Great job finishing this challenge together." : "Check off each step as your family completes it."}
            </Text>
          </View>
        </View>
      )}

      <View>
        <Text style={[styles.stepsTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Challenge Steps</Text>
        {challenge.steps.map((step, idx) => {
          const done = isStepDone(idx);
          const checkable = isActive;
          return (
            <TouchableOpacity
              key={idx}
              style={[styles.stepRow, { backgroundColor: colors.card, borderColor: done ? colors.success + "55" : colors.border }]}
              onPress={() => handleToggleStep(idx)}
              activeOpacity={checkable ? 0.7 : 1}
              disabled={!checkable}
            >
              <View style={[styles.stepNum, {
                backgroundColor: done ? colors.success : challenge.color + "22",
                borderWidth: checkable && !done ? 2 : 0,
                borderColor: challenge.color,
              }]}>
                {done ? <Feather name="check" size={14} color="#FFFFFF" /> : <Text style={[styles.stepNumText, { color: challenge.color, fontFamily: "Inter_700Bold" }]}>{idx + 1}</Text>}
              </View>
              <Text style={[styles.stepText, { color: done ? colors.mutedForeground : colors.foreground, fontFamily: "Inter_400Regular", textDecorationLine: done && !isComplete ? "line-through" : "none" }]}>{step}</Text>
            </TouchableOpacity>
          );
        })}
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
        <View style={[styles.hintBanner, { backgroundColor: colors.accent + "14", borderColor: colors.accent + "33" }]}>
          <Feather name="check-square" size={18} color={colors.accent} />
          <Text style={[styles.hintText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Tap each step above to check it off. The challenge completes automatically when all steps are done.</Text>
        </View>
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
  progressCard: { flexDirection: "row", alignItems: "center", gap: 16, padding: 16, borderRadius: 16, borderWidth: 1 },
  progressTitle: { fontSize: 16 },
  progressSub: { fontSize: 13, lineHeight: 18 },
  ring: { alignItems: "center", justifyContent: "center", borderWidth: 4 },
  ringCount: {},
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
  hintBanner: { borderRadius: 14, borderWidth: 1, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  hintText: { flex: 1, fontSize: 13, lineHeight: 19 },
  completedBanner: { borderRadius: 14, borderWidth: 1, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  completedText: { fontSize: 16 },
});
