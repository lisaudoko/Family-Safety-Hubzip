import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFamily } from "@/context/FamilyContext";
import { ASSESSMENT_QUESTIONS } from "@/data/seed";
import { ProgressBar, ScoreRing } from "@/components/UI";
import { useColors } from "@/hooks/useColors";

export default function AssessScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { progress, setAssessmentScore, awardBadge } = useFamily();
  const [started, setStarted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const totalScore = progress.assessmentScore;
  const maxScore = ASSESSMENT_QUESTIONS.length * 3;
  const hasCompleted = totalScore !== null;

  const handleSelect = (optionIndex: number) => {
    setSelected(optionIndex);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleNext = () => {
    if (selected === null) return;
    const newAnswers = [...answers, selected];
    setAnswers(newAnswers);
    setSelected(null);
    if (currentQ < ASSESSMENT_QUESTIONS.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      finishAssessment(newAnswers);
    }
  };

  const finishAssessment = async (finalAnswers: number[]) => {
    let score = 0;
    for (let i = 0; i < finalAnswers.length; i++) {
      const q = ASSESSMENT_QUESTIONS[i];
      const answerIdx = finalAnswers[i];
      if (q && answerIdx !== undefined) {
        score += q.options[answerIdx]?.score ?? 0;
      }
    }
    await setAssessmentScore(score);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const restart = () => {
    setStarted(false);
    setCurrentQ(0);
    setAnswers([]);
    setSelected(null);
  };

  const getLevel = (score: number) => {
    const pct = score / maxScore;
    if (pct >= 0.75) return { label: "Digital Safety Leader", color: colors.success, icon: "award" as const, desc: "Your family has strong digital safety foundations. Keep up the great work!" };
    if (pct >= 0.5) return { label: "Building Solid Ground", color: colors.accent, icon: "trending-up" as const, desc: "Good start! A few more conversations and practices will make your family even safer online." };
    return { label: "Starting the Journey", color: colors.info, icon: "compass" as const, desc: "Every expert starts somewhere. The courses in Learn will help you build your family's digital safety toolkit." };
  };

  const q = ASSESSMENT_QUESTIONS[currentQ];

  if (!started && !hasCompleted) {
    return (
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: topPad + 20, paddingBottom: bottomPad + 100 }]}>
        <View style={styles.introHeader}>
          <View style={[styles.introIcon, { backgroundColor: colors.secondary }]}>
            <Feather name="clipboard" size={36} color={colors.primary} />
          </View>
          <Text style={[styles.introTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Social Media Readiness Assessment</Text>
          <Text style={[styles.introDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            10 questions · 5 minutes{"\n\n"}Understand your family's current digital safety readiness and get personalized recommendations. No wrong answers — be honest for the most useful results.
          </Text>
        </View>
        <View style={styles.features}>
          {[
            { icon: "shield" as const, label: "Privacy & Safety" },
            { icon: "users" as const, label: "Family Communication" },
            { icon: "monitor" as const, label: "Screen Wellness" },
            { icon: "activity" as const, label: "Digital Footprints" },
          ].map(f => (
            <View key={f.label} style={[styles.featureRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.featureIcon, { backgroundColor: colors.secondary }]}>
                <Feather name={f.icon} size={18} color={colors.primary} />
              </View>
              <Text style={[styles.featureLabel, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>{f.label}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity style={[styles.startBtn, { backgroundColor: colors.primary }]} onPress={() => setStarted(true)} activeOpacity={0.85}>
          <Text style={[styles.startBtnText, { fontFamily: "Inter_700Bold" }]}>Start Assessment</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (hasCompleted) {
    const level = getLevel(totalScore!);
    const pct = Math.round((totalScore! / maxScore) * 100);
    const catScores = ASSESSMENT_QUESTIONS.reduce((acc: Record<string, { score: number; max: number }>, q, i) => {
      const cat = q.category;
      if (!acc[cat]) acc[cat] = { score: 0, max: 0 };
      acc[cat]!.max += 3;
      return acc;
    }, {});

    return (
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: topPad + 20, paddingBottom: bottomPad + 100 }]}>
        <Text style={[styles.pageTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Your Results</Text>
        <View style={[styles.scoreCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ScoreRing score={totalScore!} max={maxScore} size={100} />
          <View style={[styles.levelBadge, { backgroundColor: level.color + "22" }]}>
            <Feather name={level.icon} size={16} color={level.color} />
            <Text style={[styles.levelLabel, { color: level.color, fontFamily: "Inter_700Bold" }]}>{level.label}</Text>
          </View>
          <Text style={[styles.scoreDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{level.desc}</Text>
        </View>

        <View>
          <Text style={[styles.catTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Recommendations</Text>
          {pct < 75 && (
            <View style={[styles.recoCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Feather name="book-open" size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.recoTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Start with a course</Text>
                <Text style={[styles.recoDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Cyberbullying Prevention and Digital Footprints are great starting points for most families.</Text>
              </View>
            </View>
          )}
          <View style={[styles.recoCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Feather name="file-text" size={18} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.recoTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Create a Family Agreement</Text>
              <Text style={[styles.recoDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>A shared technology agreement sets expectations for everyone and opens dialogue.</Text>
            </View>
          </View>
          <View style={[styles.recoCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Feather name="sun" size={18} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.recoTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Try a Family Challenge</Text>
              <Text style={[styles.recoDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Screen-Free Saturday or Dinner Without Devices are great starting challenges.</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={[styles.retakeBtn, { borderColor: colors.border }]} onPress={restart}>
          <Text style={[styles.retakeText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Retake Assessment</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.startBtn, { backgroundColor: colors.primary }]} onPress={() => router.push("/(tabs)/learn")} activeOpacity={0.85}>
          <Text style={[styles.startBtnText, { fontFamily: "Inter_700Bold" }]}>Explore Courses</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: topPad + 20, paddingBottom: bottomPad + 100 }]} keyboardShouldPersistTaps="handled">
      <View style={styles.qProgress}>
        <Text style={[styles.qCount, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Question {currentQ + 1} of {ASSESSMENT_QUESTIONS.length}</Text>
        <ProgressBar value={currentQ} total={ASSESSMENT_QUESTIONS.length} color={colors.primary} />
      </View>

      {q && (
        <>
          <View style={[styles.categoryTag, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.categoryTagText, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>{q.category}</Text>
          </View>
          <Text style={[styles.question, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{q.question}</Text>
          <View style={styles.options}>
            {q.options.map((opt, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.option, { backgroundColor: selected === idx ? colors.primary + "15" : colors.card, borderColor: selected === idx ? colors.primary : colors.border, borderWidth: selected === idx ? 2 : 1 }]}
                onPress={() => handleSelect(idx)}
                activeOpacity={0.8}
              >
                <View style={[styles.optionDot, { borderColor: selected === idx ? colors.primary : colors.border, backgroundColor: selected === idx ? colors.primary : "transparent" }]}>
                  {selected === idx && <Feather name="check" size={12} color="#FFFFFF" />}
                </View>
                <Text style={[styles.optionText, { color: colors.foreground, fontFamily: selected === idx ? "Inter_600SemiBold" : "Inter_400Regular" }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: selected !== null ? colors.primary : colors.muted }]}
            onPress={handleNext}
            disabled={selected === null}
            activeOpacity={0.85}
          >
            <Text style={[styles.nextBtnText, { fontFamily: "Inter_700Bold" }]}>
              {currentQ === ASSESSMENT_QUESTIONS.length - 1 ? "See Results" : "Next"}
            </Text>
            <Feather name={currentQ === ASSESSMENT_QUESTIONS.length - 1 ? "check" : "arrow-right"} size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 20 },
  pageTitle: { fontSize: 28 },
  introHeader: { alignItems: "center", gap: 14 },
  introIcon: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  introTitle: { fontSize: 22, textAlign: "center" },
  introDesc: { fontSize: 14, textAlign: "center", lineHeight: 22 },
  features: { gap: 8 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  featureIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  featureLabel: { fontSize: 15 },
  startBtn: { borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  startBtnText: { color: "#FFFFFF", fontSize: 16 },
  scoreCard: { borderRadius: 20, padding: 24, alignItems: "center", borderWidth: 1, gap: 14 },
  levelBadge: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  levelLabel: { fontSize: 15 },
  scoreDesc: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  catTitle: { fontSize: 18, marginBottom: 10 },
  recoCard: { flexDirection: "row", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8, alignItems: "flex-start" },
  recoTitle: { fontSize: 15, marginBottom: 3 },
  recoDesc: { fontSize: 13, lineHeight: 18 },
  retakeBtn: { borderRadius: 14, borderWidth: 1, paddingVertical: 14, alignItems: "center" },
  retakeText: { fontSize: 15 },
  qProgress: { gap: 8 },
  qCount: { fontSize: 13 },
  categoryTag: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  categoryTagText: { fontSize: 13 },
  question: { fontSize: 20, lineHeight: 28 },
  options: { gap: 10 },
  option: { flexDirection: "row", alignItems: "flex-start", padding: 14, borderRadius: 14, gap: 12 },
  optionDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center", marginTop: 1, flexShrink: 0 },
  optionText: { flex: 1, fontSize: 15, lineHeight: 21 },
  nextBtn: { borderRadius: 16, paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
  nextBtnText: { color: "#FFFFFF", fontSize: 16 },
});
