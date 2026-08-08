import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useFamily } from "@/context/FamilyContext";
import { useAuth } from "@/context/AuthContext";
import { useCurriculum } from "@/hooks/useCurriculum";
import { type LessonSection } from "@/data/seed";
import { BottomTabBar } from "@/components/BottomTabBar";
import { useColors } from "@/hooks/useColors";
import { useHaptics } from "@/lib/haptics";
import { isLessonAvailable } from "@/lib/lessonAvailability";
import { Badge, Body, Button, Card, Caption, H1, H2, H3, Small } from "@/components/primitives";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/radius";
import { fontFamily } from "@/constants/typography";

const MIN_DURATION_FOR_GATE_MINUTES = 10;
const MIN_TIME_REQUIRED_SECONDS = 5 * 60;

function parseDurationMinutes(duration: string): number {
  const match = duration.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function ScenarioBlock({ section, accent }: { section: Extract<LessonSection, { type: "scenario" }>; accent: string }) {
  const colors = useColors();
  const haptics = useHaptics();
  const [selected, setSelected] = useState<number | null>(null);
  const answered = selected !== null;

  const handlePick = (idx: number) => {
    if (answered) return;
    setSelected(idx);
    haptics.notify(
      idx === section.correct
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Warning,
    );
  };

  return (
    <Card variant="outline" style={styles.scenarioCard}>
      <View style={styles.scenarioHeader}>
        <Feather name="help-circle" size={16} color={accent} />
        <H3 style={{ flex: 1 }}>{section.title}</H3>
      </View>
      <Body color={colors.foreground}>{section.situation}</Body>
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
              <Body color={colors.foreground} style={[styles.scenarioOptionText, isPicked && { fontFamily: fontFamily.semibold }]}>{opt}</Body>
              {answered && isCorrect && <Feather name="check-circle" size={18} color={colors.success} />}
              {answered && isPicked && !isCorrect && <Feather name="x-circle" size={18} color={colors.destructive} />}
            </TouchableOpacity>
          );
        })}
      </View>
      {answered && (
        <View style={[styles.scenarioExplain, { backgroundColor: colors.secondary }]}>
          <Feather name="info" size={15} color={accent} />
          <Caption color={colors.foreground} style={styles.scenarioExplainText}>{section.explanation}</Caption>
        </View>
      )}
    </Card>
  );
}

function TextSection({ section }: { section: Extract<LessonSection, { type: "text" }> }) {
  const colors = useColors();
  const paragraphs = section.content.split("\n\n");
  return (
    <View>
      {section.heading ? <H3 style={{ marginBottom: spacing.sm }}>{section.heading}</H3> : null}
      {paragraphs.map((para, idx) => (
        <Body key={idx} color={colors.foreground} style={styles.paragraph}>{para}</Body>
      ))}
    </View>
  );
}

function TipSection({ section, accent }: { section: Extract<LessonSection, { type: "tip" }>; accent: string }) {
  const colors = useColors();
  return (
    <View style={[styles.tipCard, { backgroundColor: accent + "12", borderColor: accent + "33" }]}>
      <Feather name={section.icon as never} size={18} color={accent} />
      <Body color={colors.foreground} style={styles.tipText}>{section.content}</Body>
    </View>
  );
}

export default function LessonScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id, courseId } = useLocalSearchParams<{ id: string; courseId: string }>();
  const { user } = useAuth();
  const { completeLesson, progress } = useFamily();
  const { courses: COURSES } = useCurriculum();
  const haptics = useHaptics();

  const course = COURSES.find(c => c.id === courseId);
  const lesson = course?.lessons.find(l => l.id === id);
  const isDone = lesson ? progress.completedLessons.includes(lesson.id) : false;
  const requiredSeconds =
    lesson && parseDurationMinutes(lesson.duration) >= MIN_DURATION_FOR_GATE_MINUTES ? MIN_TIME_REQUIRED_SECONDS : 0;

  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    setElapsedSeconds(0);
    if (requiredSeconds === 0 || isDone) return;
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [lesson?.id, requiredSeconds, isDone]);

  if (!course || !lesson) { router.back(); return null; }

  const isPremiumLocked = course.isPremium && !user?.isPremium;
  if (!isDone && !isLessonAvailable(course, lesson, progress, isPremiumLocked)) {
    router.back();
    return null;
  }

  const lessonIdx = course.lessons.findIndex(l => l.id === id);
  const nextLesson = course.lessons[lessonIdx + 1];
  const quiz = course.quizzes.find(q => q.lessonId === lesson.id);
  const quizPending = isDone && lesson.hasQuiz && !!quiz && !progress.completedQuizzes.includes(lesson.id);

  const timeGateActive = !isDone && requiredSeconds > 0 && elapsedSeconds < requiredSeconds;

  const handleComplete = async () => {
    if (timeGateActive) return;
    await completeLesson(lesson.id, course.id, course.lessons.length);
    await haptics.notify(Haptics.NotificationFeedbackType.Success);
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

  const ctaLabel = timeGateActive
    ? `Available in ${formatCountdown(requiredSeconds - elapsedSeconds)}`
    : quizPending
      ? "Take Quiz"
      : isDone
        ? (nextLesson ? "Next Lesson" : "Back to Course")
        : lesson.hasQuiz ? "Complete & Take Quiz" : "Complete Lesson";

  const ctaOnPress = quizPending
    ? () => router.push({ pathname: "/quiz/[id]", params: { id: lesson.id, courseId: course.id } })
    : isDone
      ? () => (nextLesson ? router.push({ pathname: "/lesson/[id]", params: { id: nextLesson.id, courseId: course.id } }) : router.push({ pathname: "/course/[id]", params: { id: course.id } }))
      : handleComplete;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg, paddingBottom: spacing.xxxl }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Caption color={course.color}>{course.title}</Caption>
            <Small color={colors.mutedForeground}>Lesson {lessonIdx + 1} of {course.lessons.length}</Small>
          </View>
          {isDone && <Feather name="check-circle" size={20} color={colors.success} />}
        </View>

        <View style={styles.meta}>
          <Feather name="clock" size={14} color={colors.mutedForeground} />
          <Small color={colors.mutedForeground}>{lesson.duration}</Small>
          {lesson.hasQuiz && <Badge label="Quiz included" tone={colors.primary} variant="soft" icon="edit-3" />}
        </View>

        <H1>{lesson.title}</H1>

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
                  return <H3 key={idx}>{para.replace("## ", "")}</H3>;
                }
                return <Body key={idx} color={colors.foreground} style={styles.paragraph}>{para}</Body>;
              })}
        </View>

        {lesson.keyTakeaways && lesson.keyTakeaways.length > 0 && (
          <Card variant="outline" style={[styles.takeawaysCard, { backgroundColor: course.color + "12", borderColor: course.color + "33" }]}>
            <View style={styles.takeawaysHeader}>
              <Feather name="check-circle" size={16} color={course.color} />
              <H3>Key Takeaways</H3>
            </View>
            {lesson.keyTakeaways.map((item, idx) => (
              <View key={idx} style={styles.takeawayRow}>
                <View style={[styles.takeawayDot, { backgroundColor: course.color }]} />
                <Body color={colors.foreground} style={styles.takeawayText}>{item}</Body>
              </View>
            ))}
          </Card>
        )}

        {lesson.hasQuiz && (
          <View style={[styles.quizPreview, { backgroundColor: colors.secondary, borderColor: colors.primary + "44" }]}>
            <Feather name="edit-3" size={18} color={colors.primary} />
            <View>
              <Body color={colors.foreground}>Quiz Time!</Body>
              <Caption color={colors.mutedForeground}>Test your understanding of this lesson.</Caption>
            </View>
          </View>
        )}

        <Button
          title={ctaLabel}
          onPress={ctaOnPress}
          disabled={timeGateActive}
          variant={isDone ? "secondary" : "primary"}
          style={!isDone && !timeGateActive ? { backgroundColor: course.color } : undefined}
          icon={timeGateActive ? undefined : isDone && !quizPending ? "arrow-right" : "check"}
        />
      </ScrollView>
      <BottomTabBar active="learn" />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl, gap: spacing.lg },
  header: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  meta: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  separator: { height: 1 },
  body: { gap: spacing.lg },
  paragraph: { marginBottom: spacing.sm },
  tipCard: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  tipText: { flex: 1, lineHeight: 21 },
  scenarioCard: { gap: spacing.md },
  scenarioHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  scenarioOptions: { gap: spacing.sm },
  scenarioOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, padding: spacing.md, borderRadius: radius.md },
  scenarioOptionText: { flex: 1, lineHeight: 20 },
  scenarioExplain: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, padding: spacing.md, borderRadius: radius.md },
  scenarioExplainText: { flex: 1, lineHeight: 20 },
  takeawaysCard: { gap: spacing.sm },
  takeawaysHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  takeawayRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  takeawayDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  takeawayText: { flex: 1, lineHeight: 21 },
  quizPreview: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
});
