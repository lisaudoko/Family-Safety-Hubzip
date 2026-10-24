import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFamily } from "@/context/FamilyContext";
import { ASSESSMENTS } from "@/data/seed";
import { Badge, Body, Button, Card, Caption, H1, H2, H3, ProgressBar, ScoreRing, Small } from "@/components/primitives";
import { useColors } from "@/hooks/useColors";
import { useHaptics } from "@/lib/haptics";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/radius";
import { fontFamily } from "@/constants/typography";

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

export function AssessmentsPanel() {
  const colors = useColors();
  const { progress, setAssessmentResult } = useFamily();
  const haptics = useHaptics();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
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
    haptics.impact(Haptics.ImpactFeedbackStyle.Light);
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
    await haptics.notify(Haptics.NotificationFeedbackType.Success);
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
      <View style={[styles.content, { paddingTop: 4, paddingBottom: bottomPad + 100 }]}>
        <Body color={colors.mutedForeground}>
          Quick, honest check-ins to understand your family's digital readiness and get personalized recommendations.
        </Body>

        <View style={{ gap: spacing.md }}>
          {ASSESSMENTS.map(a => {
            const r = progress.assessmentResults[a.id];
            const max = a.questions.length * 3;
            const pct = r ? Math.round((r.score / max) * 100) : null;
            return (
              <Card key={a.id} variant="outline" pressable onPress={() => openAssessment(a.id)} style={styles.assessCard}>
                <View style={[styles.assessIcon, { backgroundColor: a.color + "18" }]}>
                  <Feather name={a.iconName as never} size={24} color={a.color} />
                </View>
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <H3 style={{ marginBottom: 0 }}>{a.title}</H3>
                  <Caption color={colors.mutedForeground} numberOfLines={2}>{a.description}</Caption>
                  <View style={styles.assessMeta}>
                    <Feather name="help-circle" size={12} color={colors.mutedForeground} />
                    <Small color={colors.mutedForeground}>{a.questions.length} questions · {a.duration}</Small>
                  </View>
                </View>
                <View style={styles.assessRight}>
                  {pct !== null ? (
                    <Badge label={`${pct}%`} tone={a.color} variant="soft" />
                  ) : (
                    <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
                  )}
                </View>
              </Card>
            );
          })}
        </View>
      </View>
    );
  }

  // --- Intro ---------------------------------------------------------------
  if (assessment && !started && !result) {
    return (
      <View style={[styles.content, { paddingTop: 4, paddingBottom: bottomPad + 100 }]}>
        <TouchableOpacity style={styles.backRow} onPress={backToList}>
          <Feather name="arrow-left" size={20} color={colors.mutedForeground} />
          <Body color={colors.mutedForeground} style={{ fontSize: 14 }}>All assessments</Body>
        </TouchableOpacity>
        <View style={styles.introHeader}>
          <View style={[styles.introIcon, { backgroundColor: assessment.color + "18" }]}>
            <Feather name={assessment.iconName as never} size={36} color={assessment.color} />
          </View>
          <H1 style={styles.introTitle}>{assessment.title}</H1>
          <Body color={colors.mutedForeground} style={styles.introDesc}>
            {assessment.questions.length} questions · {assessment.duration}{"\n\n"}{assessment.description} No wrong answers — be honest for the most useful results.
          </Body>
        </View>
        <Button title="Start Assessment" onPress={() => setStarted(true)} />
      </View>
    );
  }

  // --- Results -------------------------------------------------------------
  if (assessment && !started && result) {
    const level = getLevel(result.score);
    const pct = Math.round((result.score / maxScore) * 100);
    const catScores = result.categoryScores;
    const weakCategories = Object.entries(catScores).filter(([, v]) => v.max > 0 && v.score / v.max < 0.5).map(([k]) => k);

    return (
      <View style={[styles.content, { paddingTop: 4, paddingBottom: bottomPad + 100 }]}>
        <TouchableOpacity style={styles.backRow} onPress={backToList}>
          <Feather name="arrow-left" size={20} color={colors.mutedForeground} />
          <Body color={colors.mutedForeground} style={{ fontSize: 14 }}>All assessments</Body>
        </TouchableOpacity>
        <H1>{assessment.title}</H1>

        <Card variant="outline" style={styles.scoreCard}>
          <ScoreRing score={result.score} max={maxScore} size={110} />
          <Badge label={level.label} tone={level.color} variant="soft" icon={level.icon} />
          <Body color={colors.mutedForeground} style={styles.scoreDesc}>{level.desc}</Body>
        </Card>

        <View>
          <H2 style={styles.catTitle}>Category Breakdown</H2>
          {Object.entries(catScores).map(([cat, { score, max }]) => {
            const catPct = max > 0 ? Math.round((score / max) * 100) : 0;
            const catColor = catPct >= 75 ? colors.success : catPct >= 50 ? colors.accent : colors.destructive;
            return (
              <Card key={cat} variant="outline" style={styles.catRow}>
                <View style={[styles.catIconWrap, { backgroundColor: catColor + "18" }]}>
                  <Feather name={CATEGORY_ICONS[cat] ?? "circle"} size={16} color={catColor} />
                </View>
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <Body color={colors.foreground} style={{ fontFamily: fontFamily.medium }}>{cat}</Body>
                  <ProgressBar value={catPct} total={100} color={catColor} />
                </View>
                <H3 style={{ color: catColor, marginBottom: 0, width: 44, textAlign: "right" }}>{catPct}%</H3>
              </Card>
            );
          })}
        </View>

        <View>
          <H2 style={styles.catTitle}>Personalized Recommendations</H2>
          {pct < 75 && (
            <Card variant="flat" style={[styles.recoCard, { backgroundColor: colors.secondary }]}>
              <Feather name="book-open" size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Body color={colors.foreground} style={{ fontFamily: fontFamily.semibold, marginBottom: 3 }}>Start with a course</Body>
                <Caption color={colors.mutedForeground}>The courses in Learn are great starting points for building this skill as a family.</Caption>
              </View>
            </Card>
          )}
          {(weakCategories.length > 0 ? weakCategories.slice(0, 2) : Object.keys(catScores).slice(0, 1)).map(cat => (
            <Card key={cat} variant="flat" style={[styles.recoCard, { backgroundColor: colors.secondary }]}>
              <Feather name={CATEGORY_ICONS[cat] ?? "info"} size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Body color={colors.foreground} style={{ fontFamily: fontFamily.semibold, marginBottom: 3 }}>{cat}</Body>
                <Caption color={colors.mutedForeground}>{CATEGORY_RECOMMENDATIONS[cat] ?? "Keep building your family's digital safety knowledge."}</Caption>
              </View>
            </Card>
          ))}
          <Card variant="flat" style={[styles.recoCard, { backgroundColor: colors.secondary }]}>
            <Feather name="file-text" size={18} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Body color={colors.foreground} style={{ fontFamily: fontFamily.semibold, marginBottom: 3 }}>Create a Family Agreement</Body>
              <Caption color={colors.mutedForeground}>A shared technology agreement sets expectations and opens dialogue for everyone.</Caption>
            </View>
          </Card>
        </View>

        <View style={styles.actionRow}>
          <Button
            title="Retake"
            variant="outline"
            style={{ flex: 1 }}
            onPress={() => { setStarted(true); setCurrentQ(0); setAnswers([]); setSelected(null); }}
          />
          <Button title="Explore Courses" style={{ flex: 2 }} onPress={() => router.push("/(tabs)/learn")} />
        </View>
      </View>
    );
  }

  // --- Quiz ----------------------------------------------------------------
  const q = assessment?.questions[currentQ];

  return (
    <View style={[styles.content, { paddingTop: 4, paddingBottom: bottomPad + 100 }]}>
      <View style={styles.qProgress}>
        <View style={styles.qProgressRow}>
          <Small color={colors.mutedForeground}>Question {currentQ + 1} of {assessment?.questions.length ?? 0}</Small>
          <TouchableOpacity onPress={() => Alert.alert("Quit Assessment", "Your progress won't be saved.", [{ text: "Cancel", style: "cancel" }, { text: "Quit", style: "destructive", onPress: result ? () => setStarted(false) : backToList }])}>
            <Feather name="x" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
        <ProgressBar value={currentQ} total={assessment?.questions.length ?? 1} color={colors.primary} />
      </View>

      {q && (
        <>
          <Badge label={q.category} tone={colors.primary} variant="soft" icon={CATEGORY_ICONS[q.category] ?? "circle"} />
          <H1>{q.question}</H1>
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
                  {selected === idx && <Feather name="check" size={12} color={colors.primaryForeground} />}
                </View>
                <Body color={colors.foreground} style={[styles.optionText, selected === idx && { fontFamily: fontFamily.semibold }]}>{opt.label}</Body>
              </TouchableOpacity>
            ))}
          </View>
          <Button
            title={currentQ === (assessment?.questions.length ?? 1) - 1 ? "See Results" : "Next"}
            icon={currentQ === (assessment?.questions.length ?? 1) - 1 ? "check" : "arrow-right"}
            onPress={handleNext}
            disabled={selected === null}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl, gap: spacing.xl },
  backRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  assessCard: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  assessIcon: { width: 52, height: 52, borderRadius: radius.md, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  assessMeta: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  assessRight: { marginLeft: spacing.xs, alignItems: "center", justifyContent: "center" },
  introHeader: { alignItems: "center", gap: spacing.md },
  introIcon: { width: 80, height: 80, borderRadius: radius.xl, alignItems: "center", justifyContent: "center" },
  introTitle: { textAlign: "center" },
  introDesc: { textAlign: "center" },
  scoreCard: { alignItems: "center", gap: spacing.md },
  scoreDesc: { textAlign: "center" },
  catTitle: { marginBottom: spacing.sm },
  catRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.sm },
  catIconWrap: { width: 34, height: 34, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  recoCard: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.sm, alignItems: "flex-start" },
  actionRow: { flexDirection: "row", gap: spacing.sm },
  qProgress: { gap: spacing.sm },
  qProgressRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  options: { gap: spacing.sm },
  option: { flexDirection: "row", alignItems: "flex-start", padding: spacing.md, borderRadius: radius.lg, gap: spacing.md },
  optionDot: { width: 22, height: 22, borderRadius: radius.pill, borderWidth: 2, alignItems: "center", justifyContent: "center", marginTop: 1, flexShrink: 0 },
  optionText: { flex: 1, lineHeight: 21 },
});
