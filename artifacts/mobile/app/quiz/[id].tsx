import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFamily } from "@/context/FamilyContext";
import { COURSES } from "@/data/seed";
import { ProgressBar } from "@/components/UI";
import { BottomTabBar } from "@/components/BottomTabBar";
import { useColors } from "@/hooks/useColors";

export default function QuizScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id: lessonId, courseId } = useLocalSearchParams<{ id: string; courseId: string }>();
  const { completeQuiz, awardBadge, progress } = useFamily();

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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
      <View style={[styles.doneWrap, { backgroundColor: colors.background, paddingTop: insets.top + 20, paddingBottom: 32 }]}>
        <View style={[styles.doneIcon, { backgroundColor: colors.success + "22" }]}>
          <Feather name="check-circle" size={40} color={colors.success} />
        </View>
        <Text style={[styles.doneTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Already Completed!</Text>
        <Text style={[styles.doneDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>You've already passed this quiz. Keep moving forward!</Text>
        <TouchableOpacity style={[styles.doneBtn, { backgroundColor: colors.primary }]} onPress={() => router.push({ pathname: "/course/[id]", params: { id: course.id } })}>
          <Text style={[styles.doneBtnText, { fontFamily: "Inter_700Bold" }]}>Back to Course</Text>
        </TouchableOpacity>
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
      <View style={[styles.doneWrap, { backgroundColor: colors.background, paddingTop: insets.top + 20, paddingBottom: 32 }]}>
        <View style={[styles.doneIcon, { backgroundColor: color + "22" }]}>
          <Feather name={passed ? "award" : "refresh-cw"} size={40} color={color} />
        </View>
        <Text style={[styles.score, { color: color, fontFamily: "Inter_700Bold" }]}>{finalCorrect}/{total} Correct</Text>
        <Text style={[styles.doneTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{passed ? "Well Done!" : "Keep Practicing!"}</Text>
        <Text style={[styles.doneDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {passed ? "You passed this quiz. Your knowledge is building!" : "Don't worry — review the lesson and try again. Learning takes repetition!"}
        </Text>
        <TouchableOpacity style={[styles.doneBtn, { backgroundColor: color }]} onPress={() => {
          if (nextLesson) router.push({ pathname: "/lesson/[id]", params: { id: nextLesson.id, courseId: course.id } });
          else router.push({ pathname: "/course/[id]", params: { id: course.id } });
        }}>
          <Text style={[styles.doneBtnText, { fontFamily: "Inter_700Bold" }]}>{nextLesson ? "Next Lesson" : "Finish Course"}</Text>
        </TouchableOpacity>
      </View>
      <BottomTabBar active="learn" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: 32 }]} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.quizLabel, { color: course.color, fontFamily: "Inter_600SemiBold" }]}>Quiz · {lesson.title}</Text>
        <Text style={[styles.qCount, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{currentQ + 1}/{quiz.questions.length}</Text>
      </View>
      <ProgressBar value={currentQ} total={quiz.questions.length} color={course.color} />
      <Text style={[styles.question, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{q.question}</Text>
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
              <Text style={[styles.optionText, { color: colors.foreground, fontFamily: isSelected ? "Inter_600SemiBold" : "Inter_400Regular" }]}>{opt}</Text>
              {answered && isCorrect && <Feather name="check-circle" size={18} color={colors.success} />}
              {answered && isSelected && !isCorrect && <Feather name="x-circle" size={18} color={colors.destructive} />}
            </TouchableOpacity>
          );
        })}
      </View>
      {answered && (
        <View style={[styles.explanation, { backgroundColor: colors.secondary }]}>
          <Feather name="info" size={16} color={colors.primary} />
          <Text style={[styles.explanationText, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>{q.explanation}</Text>
        </View>
      )}
      {answered && (
        <TouchableOpacity style={[styles.nextBtn, { backgroundColor: course.color }]} onPress={handleNext} activeOpacity={0.85}>
          <Text style={[styles.nextBtnText, { fontFamily: "Inter_700Bold" }]}>{isLast ? "See Results" : "Next Question"}</Text>
          <Feather name="arrow-right" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </ScrollView>
    <BottomTabBar active="learn" />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  quizLabel: { fontSize: 14, flex: 1, textAlign: "center" },
  qCount: { fontSize: 13 },
  question: { fontSize: 20, lineHeight: 28 },
  options: { gap: 10 },
  option: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 14 },
  optionText: { flex: 1, fontSize: 15, lineHeight: 21 },
  explanation: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 14, alignItems: "flex-start" },
  explanationText: { flex: 1, fontSize: 14, lineHeight: 20 },
  nextBtn: { borderRadius: 16, paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
  nextBtnText: { color: "#FFFFFF", fontSize: 16 },
  doneWrap: { flex: 1, paddingHorizontal: 24, gap: 16, alignItems: "center", justifyContent: "center" },
  doneIcon: { width: 90, height: 90, borderRadius: 45, alignItems: "center", justifyContent: "center" },
  score: { fontSize: 36 },
  doneTitle: { fontSize: 24, textAlign: "center" },
  doneDesc: { fontSize: 14, textAlign: "center", lineHeight: 21 },
  doneBtn: { borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32, alignItems: "center" },
  doneBtnText: { color: "#FFFFFF", fontSize: 16 },
});
