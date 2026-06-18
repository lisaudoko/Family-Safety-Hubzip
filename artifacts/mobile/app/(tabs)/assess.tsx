import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFamily } from "@/context/FamilyContext";
import { ASSESSMENTS } from "@/data/seed";
import { ProgressBar, ScoreRing } from "@/components/UI";
import { useColors } from "@/hooks/useColors";

const CATEGORY_ICONS: Record<string, "shield" | "users" | "eye" | "trending-up" | "globe" | "alert-triangle"> = {
  Privacy: "shield",
  Safety: "shield",
  Communication: "users",
  Wellness: "eye",
  "Digital Footprint": "trending-up",
  Scams: "alert-triangle",
};

const CATEGORY_RECOMMENDATIONS: Record<string, string> = {
  Privacy: "Review app privacy settings together and establish rules about what personal info can be shared online.",
  Safety: "Create an open-door policy — kids should feel safe telling you about anything uncomfortable online.",
  Communication: "Schedule regular tech check-ins — even 10 minutes a week builds trust and openness.",
  Wellness: "Try a Screen-Free Saturday challenge to reset your family's relationship with devices.",
  "Digital Footprint": "Google your family members together and discuss what's publicly visible.",
  Scams: "Practice spotting fake messages together — make it a game to identify phishing red flags.",
};

type Answer = { optionIndex: number; score: number; category: string };

export default function AssessScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { progress, setAssessmentResult } = useFamily();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selected, setSelected] = useState<number | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const assessment = ASSESSMENTS.find(a => a.id === selectedId) ?? null;
  const result = selectedId ? progress.assessmentResults[selectedId] : undefined;
  const maxScore = assessment ? assessment.questions.length * 3 : 30;

  const resetQuizState = () => {
    setStarted(false);
    setCurrentQ(0);
    setAnswers([]);
    setSelected(null);
  };

  const openAssessment = (id: string) => {
    resetQuizState();
    setSelectedId(id);
  };

  const backToList = () => {
    resetQuizState();
    setSelectedId(null);
  };

  const handleSelect = (optionIndex: number) => {
    setSelected(optionIndex);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const computeCategoryScores = (finalAnswers: Answer[]) => {
    const cats: Record<string, { score: number; max: number }> = {};
    if (!assessment) return cats;
    for (let i = 0; i < assessment.questions.length; i++) {
      const q = assessment.questions[i]!;
      if (!cats[q.category]) cats[q.category] = { score: 0, max: 0 };
      cats[q.category]!.max += 3;
      const ans = finalAnswers[i];
      if (ans) cats[q.category]!.score += ans.score;
    }
    return cats;
  };

  const finishAssessment = async (finalAnswers: Answer[]) => {
    if (!assessment) return;
    const score = finalAnswers.reduce((sum, a) => sum + a.score, 0);
    const categoryScores = computeCategoryScores(finalAnswers);
    await setAssessmentResult(assessment.id, score, categoryScores);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStarted(false);
  };

  const handleNext = () => {
    if (selected === null || !assessment) return;
    const q = assessment.questions[currentQ]!;
    const score = q.options[selected]?.score ?? 0;
    const newAnswers = [...answers, { optionIndex: selected, score, category: q.category }];
    setAnswers(newAnswers);
    setSelected(null);
    if (currentQ < assessment.questions.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      finishAssessment(newAnswers);
    }
  };

  const getLevel = (score: number) => {
    const pct = score / maxScore;
    if (pct >= 0.75) return { label: "Digital Safety Leader", color: colors.success, icon: "award" as const, desc: "Your family has strong foundations in this area. Keep up the great work!" };
    if (pct >= 0.5) return { label: "Building Solid Ground", color: colors.accent, icon: "trending-up" as const, desc: "Good start! A few more conversations and practices will make your family even safer." };
    return { label: "Starting the Journey", color: colors.info, icon: "compass" as const, desc: "Every expert starts somewhere. The courses in Learn will help you build your toolkit." };
  };

  // --- Assessment list -----------------------------------------------------
  if (!selectedId) {
    return (
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: topPad + 20, paddingBottom: bottomPad + 100 }]}>
        <View style={{ gap: 6 }}>
          <Text style={[styles.pageTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Assessments</Text>
          <Text style={[styles.introDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "left" }]}>
            Quick, honest check-ins to understand your family's digital readiness and get personalized recommendations.
          </Text>
        </View>

        <View style={{ gap: 12 }}>
          {ASSESSMENTS.map(a => {
            const r = progress.assessmentResults[a.id];
            const max = a.questions.length * 3;
            const pct = r ? Math.round((r.score / max) * 100) : null;
            return (
              <TouchableOpacity
                key={a.id}
                style={[styles.assessCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => openAssessment(a.id)}
                activeOpacity={0.85}
              >
                <View style={[styles.assessIcon, { backgroundColor: a.color + "18" }]}>
                  <Feather name={a.iconName as never} size={24} color={a.color} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[styles.assessTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{a.title}</Text>
                  <Text style={[styles.assessDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>{a.description}</Text>
                  <View style={styles.assessMeta}>
                    <Feather name="help-circle" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.assessMetaText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>{a.questions.length} questions · {a.duration}</Text>
                  </View>
                </View>
                <View style={styles.assessRight}>
                  {pct !== null ? (
                    <View style={[styles.scorePill, { backgroundColor: a.color + "18" }]}>
                      <Text style={[styles.scorePillText, { color: a.color, fontFamily: "Inter_700Bold" }]}>{pct}%</Text>
                    </View>
                  ) : (
                    <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    );
  }

  // --- Intro ---------------------------------------------------------------
  if (assessment && !started && !result) {
    return (
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: topPad + 20, paddingBottom: bottomPad + 100 }]}>
        <TouchableOpacity style={styles.backRow} onPress={backToList}>
          <Feather name="arrow-left" size={20} color={colors.mutedForeground} />
          <Text style={[styles.backText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>All assessments</Text>
        </TouchableOpacity>
        <View style={styles.introHeader}>
          <View style={[styles.introIcon, { backgroundColor: assessment.color + "18" }]}>
            <Feather name={assessment.iconName as never} size={36} color={assessment.color} />
          </View>
          <Text style={[styles.introTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{assessment.title}</Text>
          <Text style={[styles.introDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {assessment.questions.length} questions · {assessment.duration}{"\n\n"}{assessment.description} No wrong answers — be honest for the most useful results.
          </Text>
        </View>
        <TouchableOpacity style={[styles.startBtn, { backgroundColor: colors.primary }]} onPress={() => setStarted(true)} activeOpacity={0.85}>
          <Text style={[styles.startBtnText, { fontFamily: "Inter_700Bold" }]}>Start Assessment</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // --- Results -------------------------------------------------------------
  if (assessment && !started && result) {
    const level = getLevel(result.score);
    const pct = Math.round((result.score / maxScore) * 100);
    const catScores = result.categoryScores;
    const weakCategories = Object.entries(catScores).filter(([, v]) => v.max > 0 && v.score / v.max < 0.5).map(([k]) => k);

    return (
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: topPad + 20, paddingBottom: bottomPad + 100 }]}>
        <TouchableOpacity style={styles.backRow} onPress={backToList}>
          <Feather name="arrow-left" size={20} color={colors.mutedForeground} />
          <Text style={[styles.backText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>All assessments</Text>
        </TouchableOpacity>
        <Text style={[styles.pageTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{assessment.title}</Text>

        <View style={[styles.scoreCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ScoreRing score={result.score} max={maxScore} size={110} />
          <View style={[styles.levelBadge, { backgroundColor: level.color + "22" }]}>
            <Feather name={level.icon} size={16} color={level.color} />
            <Text style={[styles.levelLabel, { color: level.color, fontFamily: "Inter_700Bold" }]}>{level.label}</Text>
          </View>
          <Text style={[styles.scoreDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{level.desc}</Text>
        </View>

        <View>
          <Text style={[styles.catTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Category Breakdown</Text>
          {Object.entries(catScores).map(([cat, { score, max }]) => {
            const catPct = max > 0 ? Math.round((score / max) * 100) : 0;
            const catColor = catPct >= 75 ? colors.success : catPct >= 50 ? colors.accent : colors.destructive;
            return (
              <View key={cat} style={[styles.catRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.catIconWrap, { backgroundColor: catColor + "18" }]}>
                  <Feather name={CATEGORY_ICONS[cat] ?? "circle"} size={16} color={catColor} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[styles.catName, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>{cat}</Text>
                  <ProgressBar value={catPct} total={100} color={catColor} />
                </View>
                <Text style={[styles.catPct, { color: catColor, fontFamily: "Inter_700Bold" }]}>{catPct}%</Text>
              </View>
            );
          })}
        </View>

        <View>
          <Text style={[styles.catTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Personalized Recommendations</Text>
          {pct < 75 && (
            <View style={[styles.recoCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Feather name="book-open" size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.recoTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Start with a course</Text>
                <Text style={[styles.recoDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>The courses in Learn are great starting points for building this skill as a family.</Text>
              </View>
            </View>
          )}
          {(weakCategories.length > 0 ? weakCategories.slice(0, 2) : Object.keys(catScores).slice(0, 1)).map(cat => (
            <View key={cat} style={[styles.recoCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Feather name={CATEGORY_ICONS[cat] ?? "info"} size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.recoTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{cat}</Text>
                <Text style={[styles.recoDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{CATEGORY_RECOMMENDATIONS[cat] ?? "Keep building your family's digital safety knowledge."}</Text>
              </View>
            </View>
          ))}
          <View style={[styles.recoCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Feather name="file-text" size={18} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.recoTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Create a Family Agreement</Text>
              <Text style={[styles.recoDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>A shared technology agreement sets expectations and opens dialogue for everyone.</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.retakeBtn, { borderColor: colors.border, flex: 1 }]} onPress={() => { setStarted(true); setCurrentQ(0); setAnswers([]); setSelected(null); }}>
            <Text style={[styles.retakeText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.startBtn, { backgroundColor: colors.primary, flex: 2 }]} onPress={() => router.push("/(tabs)/learn")} activeOpacity={0.85}>
            <Text style={[styles.startBtnText, { fontFamily: "Inter_700Bold" }]}>Explore Courses</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // --- Quiz ----------------------------------------------------------------
  const q = assessment?.questions[currentQ];

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: topPad + 20, paddingBottom: bottomPad + 100 }]} keyboardShouldPersistTaps="handled">
      <View style={styles.qProgress}>
        <View style={styles.qProgressRow}>
          <Text style={[styles.qCount, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Question {currentQ + 1} of {assessment?.questions.length ?? 0}</Text>
          <TouchableOpacity onPress={() => Alert.alert("Quit Assessment", "Your progress won't be saved.", [{ text: "Cancel", style: "cancel" }, { text: "Quit", style: "destructive", onPress: result ? () => setStarted(false) : backToList }])}>
            <Feather name="x" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
        <ProgressBar value={currentQ} total={assessment?.questions.length ?? 1} color={colors.primary} />
      </View>

      {q && (
        <>
          <View style={[styles.categoryTag, { backgroundColor: colors.secondary }]}>
            <Feather name={CATEGORY_ICONS[q.category] ?? "circle"} size={13} color={colors.primary} />
            <Text style={[styles.categoryTagText, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>{q.category}</Text>
          </View>
          <Text style={[styles.question, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{q.question}</Text>
          <View style={styles.options}>
            {q.options.map((opt, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.option, {
                  backgroundColor: selected === idx ? colors.primary + "15" : colors.card,
                  borderColor: selected === idx ? colors.primary : colors.border,
                  borderWidth: selected === idx ? 2 : 1,
                }]}
                onPress={() => handleSelect(idx)}
                activeOpacity={0.8}
              >
                <View style={[styles.optionDot, {
                  borderColor: selected === idx ? colors.primary : colors.border,
                  backgroundColor: selected === idx ? colors.primary : "transparent",
                }]}>
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
              {currentQ === (assessment?.questions.length ?? 1) - 1 ? "See Results" : "Next"}
            </Text>
            <Feather name={currentQ === (assessment?.questions.length ?? 1) - 1 ? "check" : "arrow-right"} size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 20 },
  pageTitle: { fontSize: 28 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  backText: { fontSize: 14 },
  assessCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 18, borderWidth: 1 },
  assessIcon: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  assessTitle: { fontSize: 16 },
  assessDesc: { fontSize: 13, lineHeight: 18 },
  assessMeta: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  assessMetaText: { fontSize: 12 },
  assessRight: { marginLeft: 4, alignItems: "center", justifyContent: "center" },
  scorePill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  scorePillText: { fontSize: 14 },
  introHeader: { alignItems: "center", gap: 14 },
  introIcon: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  introTitle: { fontSize: 22, textAlign: "center" },
  introDesc: { fontSize: 14, textAlign: "center", lineHeight: 22 },
  startBtn: { borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  startBtnText: { color: "#FFFFFF", fontSize: 16 },
  scoreCard: { borderRadius: 20, padding: 24, alignItems: "center", borderWidth: 1, gap: 14 },
  levelBadge: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  levelLabel: { fontSize: 15 },
  scoreDesc: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  catTitle: { fontSize: 18, marginBottom: 10 },
  catRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  catIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  catName: { fontSize: 13, marginBottom: 2 },
  catPct: { fontSize: 14, width: 38, textAlign: "right" },
  recoCard: { flexDirection: "row", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8, alignItems: "flex-start" },
  recoTitle: { fontSize: 15, marginBottom: 3 },
  recoDesc: { fontSize: 13, lineHeight: 18 },
  actionRow: { flexDirection: "row", gap: 10 },
  retakeBtn: { borderRadius: 14, borderWidth: 1, paddingVertical: 14, alignItems: "center" },
  retakeText: { fontSize: 15 },
  qProgress: { gap: 8 },
  qProgressRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  qCount: { fontSize: 13 },
  categoryTag: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  categoryTagText: { fontSize: 13 },
  question: { fontSize: 20, lineHeight: 28 },
  options: { gap: 10 },
  option: { flexDirection: "row", alignItems: "flex-start", padding: 14, borderRadius: 14, gap: 12 },
  optionDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center", marginTop: 1, flexShrink: 0 },
  optionText: { flex: 1, fontSize: 15, lineHeight: 21 },
  nextBtn: { borderRadius: 16, paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
  nextBtnText: { color: "#FFFFFF", fontSize: 16 },
});
