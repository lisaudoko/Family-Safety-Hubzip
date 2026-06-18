import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFamily } from "@/context/FamilyContext";
import { COURSES, type LessonSection } from "@/data/seed";
import { BottomTabBar } from "@/components/BottomTabBar";
import { useColors } from "@/hooks/useColors";

function ScenarioBlock({ section, accent }: { section: Extract<LessonSection, { type: "scenario" }>; accent: string }) {
  const colors = useColors();
  const [selected, setSelected] = useState<number | null>(null);
  const answered = selected !== null;

  const handlePick = (idx: number) => {
    if (answered) return;
    setSelected(idx);
    Haptics.notificationAsync(
      idx === section.correct
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Warning,
    );
  };

  return (
    <View style={[styles.scenarioCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.scenarioHeader}>
        <Feather name="help-circle" size={16} color={accent} />
        <Text style={[styles.scenarioTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{section.title}</Text>
      </View>
      <Text style={[styles.scenarioSituation, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>{section.situation}</Text>
      <View style={styles.scenarioOptions}>
        {section.options.map((opt, idx) => {
          const isCorrect = idx === section.correct;
          const isPicked = idx === selected;
          const bg = !answered ? colors.secondary : isCorrect ? colors.success + "22" : isPicked ? colors.destructive + "22" : colors.secondary;
          const border = !answered ? colors.border : isCorrect ? colors.success : isPicked ? colors.destructive : colors.border;
          return (
            <TouchableOpacity
              key={idx}
              style={[styles.scenarioOption, { backgroundColor: bg, borderColor: border, borderWidth: isPicked || (answered && isCorrect) ? 2 : 1 }]}
              onPress={() => handlePick(idx)}
              activeOpacity={answered ? 1 : 0.8}
            >
              <Text style={[styles.scenarioOptionText, { color: colors.foreground, fontFamily: isPicked ? "Inter_600SemiBold" : "Inter_400Regular" }]}>{opt}</Text>
              {answered && isCorrect && <Feather name="check-circle" size={18} color={colors.success} />}
              {answered && isPicked && !isCorrect && <Feather name="x-circle" size={18} color={colors.destructive} />}
            </TouchableOpacity>
          );
        })}
      </View>
      {answered && (
        <View style={[styles.scenarioExplain, { backgroundColor: colors.secondary }]}>
          <Feather name="info" size={15} color={accent} />
          <Text style={[styles.scenarioExplainText, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>{section.explanation}</Text>
        </View>
      )}
    </View>
  );
}

function TextSection({ section }: { section: Extract<LessonSection, { type: "text" }> }) {
  const colors = useColors();
  const paragraphs = section.content.split("\n\n");
  return (
    <View style={styles.textSection}>
      {section.heading ? (
        <Text style={[styles.heading, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{section.heading}</Text>
      ) : null}
      {paragraphs.map((para, idx) => (
        <Text key={idx} style={[styles.paragraph, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>{para}</Text>
      ))}
    </View>
  );
}

function TipSection({ section, accent }: { section: Extract<LessonSection, { type: "tip" }>; accent: string }) {
  const colors = useColors();
  return (
    <View style={[styles.tipCard, { backgroundColor: accent + "12", borderColor: accent + "33" }]}>
      <Feather name={section.icon as never} size={18} color={accent} />
      <Text style={[styles.tipText, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>{section.content}</Text>
    </View>
  );
}

export default function LessonScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id, courseId } = useLocalSearchParams<{ id: string; courseId: string }>();
  const { completeLesson, progress } = useFamily();

  const course = COURSES.find(c => c.id === courseId);
  const lesson = course?.lessons.find(l => l.id === id);
  if (!course || !lesson) { router.back(); return null; }

  const lessonIdx = course.lessons.findIndex(l => l.id === id);
  const nextLesson = course.lessons[lessonIdx + 1];
  const isDone = progress.completedLessons.includes(lesson.id);
  const quiz = course.quizzes.find(q => q.lessonId === lesson.id);

  const handleComplete = async () => {
    await completeLesson(lesson.id, course.id, course.lessons.length);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (lesson.hasQuiz && quiz) {
      router.push({ pathname: "/quiz/[id]", params: { id: lesson.id, courseId: course.id } });
    } else if (nextLesson) {
      router.push({ pathname: "/lesson/[id]", params: { id: nextLesson.id, courseId: course.id } });
    } else {
      router.push({ pathname: "/course/[id]", params: { id: course.id } });
    }
  };

  const hasSections = !!lesson.sections && lesson.sections.length > 0;
  const paragraphs = lesson.content.split("\n\n");

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: 32 }]} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.courseLabel, { color: course.color, fontFamily: "Inter_500Medium" }]}>{course.title}</Text>
          <Text style={[styles.lessonNum, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Lesson {lessonIdx + 1} of {course.lessons.length}</Text>
        </View>
        {isDone && <Feather name="check-circle" size={20} color={colors.success} />}
      </View>

      <View style={styles.meta}>
        <Feather name="clock" size={14} color={colors.mutedForeground} />
        <Text style={[styles.duration, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{lesson.duration}</Text>
        {lesson.hasQuiz && (
          <View style={[styles.quizTag, { backgroundColor: colors.primary + "22" }]}>
            <Feather name="edit-3" size={12} color={colors.primary} />
            <Text style={[styles.quizTagText, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>Quiz included</Text>
          </View>
        )}
      </View>

      <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{lesson.title}</Text>

      <View style={[styles.separator, { backgroundColor: colors.border }]} />

      <View style={styles.body}>
        {hasSections
          ? lesson.sections!.map((section, idx) => {
              if (section.type === "tip") return <TipSection key={idx} section={section} accent={course.color} />;
              if (section.type === "scenario") return <ScenarioBlock key={idx} section={section} accent={course.color} />;
              return <TextSection key={idx} section={section} />;
            })
          : paragraphs.map((para, idx) => {
              if (para.startsWith("##")) {
                return <Text key={idx} style={[styles.heading, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{para.replace("## ", "")}</Text>;
              }
              return (
                <Text key={idx} style={[styles.paragraph, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>{para}</Text>
              );
            })}
      </View>

      {lesson.keyTakeaways && lesson.keyTakeaways.length > 0 && (
        <View style={[styles.takeawaysCard, { backgroundColor: course.color + "12", borderColor: course.color + "33" }]}>
          <View style={styles.takeawaysHeader}>
            <Feather name="check-circle" size={16} color={course.color} />
            <Text style={[styles.takeawaysTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Key Takeaways</Text>
          </View>
          {lesson.keyTakeaways.map((item, idx) => (
            <View key={idx} style={styles.takeawayRow}>
              <View style={[styles.takeawayDot, { backgroundColor: course.color }]} />
              <Text style={[styles.takeawayText, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>{item}</Text>
            </View>
          ))}
        </View>
      )}

      {lesson.hasQuiz && (
        <View style={[styles.quizPreview, { backgroundColor: colors.secondary, borderColor: colors.primary + "44" }]}>
          <Feather name="edit-3" size={18} color={colors.primary} />
          <View>
            <Text style={[styles.quizTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Quiz Time!</Text>
            <Text style={[styles.quizDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Test your understanding of this lesson.</Text>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[styles.completeBtn, { backgroundColor: isDone ? colors.muted : course.color }]}
        onPress={isDone ? () => (nextLesson ? router.push({ pathname: "/lesson/[id]", params: { id: nextLesson.id, courseId: course.id } }) : router.push({ pathname: "/course/[id]", params: { id: course.id } })) : handleComplete}
        activeOpacity={0.85}
      >
        <Text style={[styles.completeBtnText, { fontFamily: "Inter_700Bold", color: isDone ? colors.foreground : "#FFFFFF" }]}>
          {isDone ? (nextLesson ? "Next Lesson" : "Back to Course") : lesson.hasQuiz ? "Complete & Take Quiz" : "Complete Lesson"}
        </Text>
        <Feather name={isDone ? "arrow-right" : "check"} size={18} color={isDone ? colors.foreground : "#FFFFFF"} />
      </TouchableOpacity>
    </ScrollView>
    <BottomTabBar active="learn" />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 16 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  courseLabel: { fontSize: 13 },
  lessonNum: { fontSize: 13 },
  meta: { flexDirection: "row", alignItems: "center", gap: 8 },
  duration: { fontSize: 13 },
  quizTag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  quizTagText: { fontSize: 12 },
  title: { fontSize: 24, lineHeight: 32 },
  separator: { height: 1 },
  body: { gap: 16 },
  heading: { fontSize: 18, marginBottom: 8 },
  paragraph: { fontSize: 15, lineHeight: 24, marginBottom: 8 },
  textSection: {},
  tipCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  tipText: { flex: 1, fontSize: 14, lineHeight: 21 },
  scenarioCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  scenarioHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  scenarioTitle: { fontSize: 15, flex: 1 },
  scenarioSituation: { fontSize: 14, lineHeight: 21 },
  scenarioOptions: { gap: 8 },
  scenarioOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, padding: 12, borderRadius: 12 },
  scenarioOptionText: { flex: 1, fontSize: 14, lineHeight: 20 },
  scenarioExplain: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 12 },
  scenarioExplainText: { flex: 1, fontSize: 13, lineHeight: 20 },
  takeawaysCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  takeawaysHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  takeawaysTitle: { fontSize: 15 },
  takeawayRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  takeawayDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  takeawayText: { flex: 1, fontSize: 14, lineHeight: 21 },
  quizPreview: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  quizTitle: { fontSize: 15, marginBottom: 2 },
  quizDesc: { fontSize: 13 },
  completeBtn: { borderRadius: 16, paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
  completeBtnText: { fontSize: 16 },
});
