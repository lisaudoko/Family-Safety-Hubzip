import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useFamily } from "@/context/FamilyContext";
import { useCurriculum } from "@/hooks/useCurriculum";
import { Body, Button, Caption, Display, H1, ProgressBar, Small } from "@/components/primitives";
import { BottomTabBar } from "@/components/BottomTabBar";
import { useColors } from "@/hooks/useColors";
import { useHaptics } from "@/lib/haptics";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/radius";
import { fontFamily } from "@/constants/typography";

export default function QuizScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id: lessonId, courseId } = useLocalSearchParams<{ id: string; courseId: string }>();
  const { completeQuiz, awardBadge, progress } = useFamily();
  const haptics = useHaptics();
  const { courses: COURSES } = useCurriculum();

  const course = COURSES.find(c => c.id === courseId);
  const quiz = course?.quizzes.find(q => q.lessonId === lessonId);
  const lesson = course?.lessons.find(l => l.id === lessonId);

  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [answered, setAnswered] = useState(false);

  if (!course || !quiz || !lesson) { router.back(); return null; }

  const q = quiz.questions[currentQ];
  const isLast = currentQ === quiz.questions.length - 1;
  const isAlreadyDone = progress.completedQuizzes.includes(lessonId);

  if (!q) { router.back(); return null; }

  const handleSelect = (idx: number) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    if (idx === q.correctIndex) {
      setCorrect(c => c + 1);
      haptics.notify(Haptics.NotificationFeedbackType.Success);
    } else {
      haptics.notify(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleNext = async () => {
    if (isLast) {
      await completeQuiz(lessonId);
      // `correct` already includes the final answer here: handleSelect set it
      // before the re-render that revealed this button, so no extra increment.
      if (correct === quiz.questions.length) {
        await awardBadge("b4");
      }
      setShowResult(true);
    } else {
      setCurrentQ(c => c + 1);
      setSelected(null);
      setAnswered(false);
    }
  };

  if (isAlreadyDone && !showResult) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[styles.doneWrap, { backgroundColor: colors.background, paddingTop: insets.top + spacing.xl, paddingBottom: spacing.xxxl }]}>
          <View style={[styles.doneIcon, { backgroundColor: colors.success + "22" }]}>
            <Feather name="check-circle" size={40} color={colors.success} />
          </View>
          <H1 style={styles.doneTitle}>Already Completed!</H1>
          <Body color={colors.mutedForeground} style={styles.doneDesc}>You&apos;ve already passed this quiz. Keep moving forward!</Body>
          <Button title="Back to Course" onPress={() => router.push({ pathname: "/course/[id]", params: { id: course.id } })} fullWidth={false} style={styles.doneBtn} />
        </View>
        <BottomTabBar active="learn" />
      </View>
    );
  }

  if (showResult) {
    const finalCorrect = correct;
    const total = quiz.questions.length;
    const passed = finalCorrect >= Math.ceil(total * 0.6);
    const color = passed ? colors.success : colors.destructive;
    const nextLesson = course.lessons[course.lessons.findIndex(l => l.id === lessonId) + 1];
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[styles.doneWrap, { backgroundColor: colors.background, paddingTop: insets.top + spacing.xl, paddingBottom: spacing.xxxl }]}>
          <View style={[styles.doneIcon, { backgroundColor: color + "22" }]}>
            <Feather name={passed ? "award" : "refresh-cw"} size={40} color={color} />
          </View>
          <Display style={{ color }}>{finalCorrect}/{total} Correct</Display>
          <H1 style={styles.doneTitle}>{passed ? "Well Done!" : "Keep Practicing!"}</H1>
          <Body color={colors.mutedForeground} style={styles.doneDesc}>
            {passed ? "You passed this quiz. Your knowledge is building!" : "Don't worry — review the lesson and try again. Learning takes repetition!"}
          </Body>
          <Button
            title={nextLesson ? "Next Lesson" : "Finish Course"}
            fullWidth={false}
            style={[styles.doneBtn, { backgroundColor: color }]}
            onPress={() => {
              if (nextLesson) router.push({ pathname: "/lesson/[id]", params: { id: nextLesson.id, courseId: course.id } });
              else router.push({ pathname: "/course/[id]", params: { id: course.id } });
            }}
          />
        </View>
        <BottomTabBar active="learn" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg, paddingBottom: spacing.xxxl }]} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Caption color={course.color} style={styles.quizLabel}>Quiz · {lesson.title}</Caption>
          <Small color={colors.mutedForeground}>{currentQ + 1}/{quiz.questions.length}</Small>
        </View>
        <ProgressBar value={currentQ} total={quiz.questions.length} color={course.color} />
        <H1>{q.question}</H1>
        <View style={styles.options}>
          {q.options.map((opt, idx) => {
            const isCorrect = idx === q.correctIndex;
            const isSelected = idx === selected;
            const bgColor = !answered ? colors.card : isCorrect ? colors.success + "22" : isSelected ? colors.destructive + "22" : colors.card;
            const borderColor = !answered ? colors.border : isCorrect ? colors.success : isSelected ? colors.destructive : colors.border;
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.option, { backgroundColor: bgColor, borderColor, borderWidth: isSelected || (answered && isCorrect) ? 2 : 1 }]}
                onPress={() => handleSelect(idx)}
                activeOpacity={answered ? 1 : 0.8}
              >
                <Body color={colors.foreground} style={[styles.optionText, isSelected && { fontFamily: fontFamily.semibold }]}>{opt}</Body>
                {answered && isCorrect && <Feather name="check-circle" size={18} color={colors.success} />}
                {answered && isSelected && !isCorrect && <Feather name="x-circle" size={18} color={colors.destructive} />}
              </TouchableOpacity>
            );
          })}
        </View>
        {answered && (
          <View style={[styles.explanation, { backgroundColor: colors.secondary }]}>
            <Feather name="info" size={16} color={colors.primary} />
            <Caption color={colors.foreground} style={styles.explanationText}>{q.explanation}</Caption>
          </View>
        )}
        {answered && (
          <Button
            title={isLast ? "See Results" : "Next Question"}
            icon="arrow-right"
            style={{ backgroundColor: course.color }}
            onPress={handleNext}
          />
        )}
      </ScrollView>
      <BottomTabBar active="learn" />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl, gap: spacing.xl },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  quizLabel: { flex: 1, textAlign: "center" },
  options: { gap: spacing.sm },
  option: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.md, borderRadius: radius.lg },
  optionText: { flex: 1, lineHeight: 21 },
  explanation: { flexDirection: "row", gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, alignItems: "flex-start" },
  explanationText: { flex: 1, lineHeight: 20 },
  doneWrap: { flex: 1, paddingHorizontal: spacing.xxl, gap: spacing.lg, alignItems: "center", justifyContent: "center" },
  doneIcon: { width: 90, height: 90, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  doneTitle: { textAlign: "center" },
  doneDesc: { textAlign: "center" },
  doneBtn: { paddingHorizontal: spacing.xxl },
});
