import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useAuth } from "@/context/AuthContext";
import { useFamily } from "@/context/FamilyContext";
import { CHALLENGES } from "@/data/seed";
import { useColors } from "@/hooks/useColors";
import { useHaptics } from "@/lib/haptics";
import { Badge, Body, Button, Card, Caption, H1, H3 } from "@/components/primitives";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/radius";
import { fontFamily } from "@/constants/typography";

function StepRing({ done, total, color, size = 60 }: { done: number; total: number; color: string; size?: number }) {
  const colors = useColors();
  const pct = total > 0 ? done / total : 0;
  const ringColor = pct >= 1 ? colors.success : color;
  return (
    <View style={[styles.ring, { width: size, height: size, borderRadius: size / 2, borderColor: ringColor, backgroundColor: ringColor + "14" }]}>
      <Body color={ringColor} style={{ fontFamily: fontFamily.bold, fontSize: size * 0.3 }}>{done}/{total}</Body>
    </View>
  );
}

export default function ChallengeDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { progress, startChallenge, completeChallengeStep } = useFamily();
  const haptics = useHaptics();

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
    try {
      await startChallenge(challenge.id);
      await haptics.notify(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      console.error("[challenge] start error:", e?.message || e);
      Alert.alert("Error", "Failed to start challenge. Please try again.");
    }
  };

  const handleToggleStep = async (idx: number) => {
    if (!isActive) return;
    try {
      const justCompleted = await completeChallengeStep(challenge.id, idx, totalSteps);
      if (justCompleted) {
        await haptics.notify(Haptics.NotificationFeedbackType.Success);
      } else {
        await haptics.impact(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (e: any) {
      console.error("[challenge] step error:", e?.message || e);
      Alert.alert("Error", "Failed to update step. Please try again.");
    }
  };

  const statusColors = { available: colors.primary, active: colors.accent, completed: colors.success };
  const statusColor = statusColors[status];
  const statusLabel = status === "available" ? "Available" : status === "active" ? "In Progress" : "Complete";

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xxl }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Badge label={statusLabel} tone={statusColor} variant="soft" />
      </View>

      <Card variant="flat" style={[styles.heroCard, { backgroundColor: challenge.color + "18" }]}>
        <View style={[styles.heroIcon, { backgroundColor: challenge.color + "33" }]}>
          <Feather name={challenge.iconName as never} size={36} color={challenge.color} />
        </View>
        <Badge label={challenge.category} tone={challenge.color} variant="solid" />
        <H1>{challenge.title}</H1>
        <Body color={colors.mutedForeground}>{challenge.description}</Body>
        <View style={styles.meta}>
          <Feather name="clock" size={14} color={colors.mutedForeground} />
          <Caption color={colors.mutedForeground}>{challenge.duration}</Caption>
          {challenge.isPremium && <Badge label="Premium" tone={colors.accent} variant="soft" icon="star" />}
        </View>
      </Card>

      {(isActive || isComplete) && (
        <Card variant="outline" style={styles.progressCard}>
          <StepRing done={doneCount} total={totalSteps} color={challenge.color} />
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Body color={colors.foreground}>
              {isComplete ? "All steps complete!" : `${doneCount} of ${totalSteps} steps done`}
            </Body>
            <Caption color={colors.mutedForeground}>
              {isComplete ? "Great job finishing this challenge together." : "Check off each step as your family completes it."}
            </Caption>
          </View>
        </Card>
      )}

      <View>
        <H3>Challenge Steps</H3>
        {challenge.steps.map((step, idx) => {
          const done = isStepDone(idx);
          const checkable = isActive;
          return (
            <Card
              key={idx}
              variant="outline"
              pressable={checkable}
              onPress={() => handleToggleStep(idx)}
              style={[styles.stepRow, { borderColor: done ? colors.success + "55" : colors.border }]}
            >
              <View style={[styles.stepNum, {
                backgroundColor: done ? colors.success : challenge.color + "22",
                borderWidth: checkable && !done ? 2 : 0,
                borderColor: challenge.color,
              }]}>
                {done ? <Feather name="check" size={14} color={colors.primaryForeground} /> : <Body color={challenge.color}>{idx + 1}</Body>}
              </View>
              <Body color={done ? colors.mutedForeground : colors.foreground} style={[styles.stepText, done && !isComplete && { textDecorationLine: "line-through" }]}>{step}</Body>
            </Card>
          );
        })}
      </View>

      {challenge.tips && challenge.tips.length > 0 && (
        <Card variant="flat" style={[styles.tipsCard, { backgroundColor: colors.secondary }]}>
          <View style={styles.tipsHeader}>
            <Feather name="zap" size={16} color={challenge.color} />
            <H3 style={{ marginBottom: 0 }}>Tips for Success</H3>
          </View>
          {challenge.tips.map((tip, idx) => (
            <View key={idx} style={styles.tipRow}>
              <View style={[styles.tipDot, { backgroundColor: challenge.color }]} />
              <Caption color={colors.mutedForeground} style={styles.tipText}>{tip}</Caption>
            </View>
          ))}
        </Card>
      )}

      {challenge.successCriteria && (
        <Card variant="outline" style={[styles.criteriaCard, { backgroundColor: colors.success + "12", borderColor: colors.success + "33" }]}>
          <Feather name="target" size={18} color={colors.success} />
          <View style={{ flex: 1, gap: 2 }}>
            <H3 style={{ marginBottom: 0 }}>How to Complete It</H3>
            <Caption color={colors.mutedForeground}>{challenge.successCriteria}</Caption>
          </View>
        </Card>
      )}

      <Card variant="flat" style={[styles.whyCard, { backgroundColor: colors.secondary }]}>
        <H3 style={{ marginBottom: 0 }}>Why This Matters</H3>
        <Caption color={colors.mutedForeground}>
          Family challenges work because they create shared experiences and memories that strengthen your family culture around technology. Research shows families that actively discuss and practice healthy tech habits build more resilient children.
        </Caption>
      </Card>

      {isLocked && (
        <Button title="Unlock with Premium" icon="lock" style={{ backgroundColor: colors.accent }} onPress={() => router.push("/subscription")} />
      )}
      {!isLocked && status === "available" && (
        <Button title="Start Challenge" icon="play" style={{ backgroundColor: challenge.color }} onPress={handleStart} />
      )}
      {status === "active" && (
        <Card variant="flat" style={[styles.hintBanner, { backgroundColor: colors.accent + "14" }]}>
          <Feather name="check-square" size={18} color={colors.accent} />
          <Body color={colors.foreground} style={styles.hintText}>Tap each step above to check it off. The challenge completes automatically when all steps are done.</Body>
        </Card>
      )}
      {status === "completed" && (
        <Card variant="outline" style={[styles.completedBanner, { backgroundColor: colors.success + "18", borderColor: colors.success + "44" }]}>
          <Feather name="award" size={22} color={colors.success} />
          <Body color={colors.success}>Challenge Complete! Amazing work.</Body>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl, gap: spacing.xxl },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroCard: { gap: spacing.md },
  heroIcon: { width: 64, height: 64, borderRadius: radius.xl, alignItems: "center", justifyContent: "center" },
  meta: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  progressCard: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  ring: { alignItems: "center", justifyContent: "center", borderWidth: 4 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  stepNum: { width: 28, height: 28, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  stepText: { flex: 1, lineHeight: 20, paddingTop: 3 },
  tipsCard: { gap: spacing.sm },
  tipsHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  tipDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  tipText: { flex: 1, lineHeight: 20 },
  criteriaCard: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  whyCard: { gap: spacing.sm },
  hintBanner: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  hintText: { flex: 1, lineHeight: 19 },
  completedBanner: { flexDirection: "row", alignItems: "center", gap: spacing.md },
});
