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

export default function AssessScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { progress, setAssessmentScore, awardBadge } = useFamily();
  const [started, setStarted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<{ optionIndex: number; score: number; category: string }[]>([]);
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
    const q = ASSESSMENT_QUESTIONS[currentQ]!;
    const score = q.options[selected]?.score ?? 0;
    const newAnswers = [...answers, { optionIndex: selected, score, category: q.category }];
    setAnswers(newAnswers);
    setSelected(null);
    if (currentQ < ASSESSMENT_QUESTIONS.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      finishAssessment(newAnswers);
    }
  };

  const finishAssessment = async (finalAnswers: typeof answers) => {
    const score = finalAnswers.reduce((sum, a) => sum + a.score, 0);
    await setAssessmentScore(score);
    if (score / maxScore >= 0.75) await awardBadge("b10");
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

  const getCategoryScores = (finalAnswers: typeof answers) => {
    const cats: Record<string, { score: number; max: number }> = {};
    for (let i = 0; i < ASSESSMENT_QUESTIONS.length; i++) {
      const q = ASSESSMENT_QUESTIONS[i]!;
      if (!cats[q.category]) cats[q.category] = { score: 0, max: 0 };
      cats[q.category]!.max += 3;
      const ans = finalAnswers[i];
      if (ans) cats[q.category]!.score += ans.score;
    }
    return cats;
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
            {ASSESSMENT_QUESTIONS.length} questions · ~5 minutes{"\n\n"}Understand your family's digital safety readiness and get personalized recommendations. No wrong answers — be honest for the most useful results.
          </Text>
        </View>
        <View style={styles.features}>
          {[
            { icon: "shield" as const, label: "Privacy & Safety", desc: "What information is safe to share online?" },
            { icon: "users" as const, label: "Family Communication", desc: "How open is your family about digital life?" },
            { icon: "eye" as const, label: "Screen Wellness", desc: "Are devices balanced with other activities?" },
            { icon: "trending-up" as const, label: "Digital Footprints", desc: "What traces do you leave online?" },
          ].map(f => (
            <View key={f.label} style={[styles.featureRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.featureIcon, { backgroundColor: colors.secondary }]}>
                <Feather name={f.icon} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.featureLabel, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>{f.label}</Text>
                <Text style={[styles.featureDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{f.desc}</Text>
              </View>
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
    const catScores = getCategoryScores(answers);
    const weakCategories = Object.entries(catScores).filter(([, v]) => v.max > 0 && v.score / v.max < 0.5).map(([k]) => k);

    return (
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: topPad + 20, paddingBottom: bottomPad + 100 }]}>
        <Text style={[styles.pageTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Your Results</Text>

        <View style={[styles.scoreCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ScoreRing score={totalScore!} max={maxScore} size={110} />
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
                <Text style={[styles.recoDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Cyberbullying Prevention and Digital Footprints are great starting points for most families.</Text>
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
          <TouchableOpacity style={[styles.retakeBtn, { borderColor: colors.border, flex: 1 }]} onPress={restart}>
            <Text style={[styles.retakeText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.startBtn, { backgroundColor: colors.primary, flex: 2 }]} onPress={() => router.push("/(tabs)/learn")} activeOpacity={0.85}>
            <Text style={[styles.startBtnText, { fontFamily: "Inter_700Bold" }]}>Explore Courses</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: topPad + 20, paddingBottom: bottomPad + 100 }]} keyboardShouldPersistTaps="handled">
      <View style={styles.qProgress}>
        <View style={styles.qProgressRow}>
          <Text style={[styles.qCount, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Question {currentQ + 1} of {ASSESSMENT_QUESTIONS.length}</Text>
          <TouchableOpacity onPress={() => Alert.alert("Quit Assessment", "Your progress won't be saved.", [{ text: "Cancel", style: "cancel" }, { text: "Quit", style: "destructive", onPress: restart }])}>
            <Feather name="x" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
        <ProgressBar value={currentQ} total={ASSESSMENT_QUESTIONS.length} color={colors.primary} />
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
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  featureIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  featureLabel: { fontSize: 14, marginBottom: 2 },
  featureDesc: { fontSize: 12, lineHeight: 17 },
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
