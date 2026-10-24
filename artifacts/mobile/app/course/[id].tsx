import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useFamily } from "@/context/FamilyContext";
import { useAuth } from "@/context/AuthContext";
import { useCurriculum } from "@/hooks/useCurriculum";
import { Badge, Body, Button, Card, Caption, H1, H2, ProgressBar, Small } from "@/components/primitives";
import { BottomTabBar } from "@/components/BottomTabBar";
import { useColors } from "@/hooks/useColors";
import { isLessonAvailable } from "@/lib/lessonAvailability";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/radius";

export default function CourseDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { progress } = useFamily();
  const { courses: COURSES } = useCurriculum();

  const course = COURSES.find(c => c.id === id);
  if (!course) { router.back(); return null; }

  const isLocked = course.isPremium && !user?.isPremium;
  const completedLessons = course.lessons.filter(l => progress.completedLessons.includes(l.id));
  const courseProgress = progress.courseProgress[course.id] ?? 0;
  const isComplete = courseProgress === 100;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingBottom: spacing.xxxl }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: course.color + "18", paddingTop: insets.top + spacing.lg }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="arrow-left" size={22} color={course.color} />
          </TouchableOpacity>
          <View style={[styles.heroIcon, { backgroundColor: course.color + "33" }]}>
            <Feather name={course.iconName as never} size={36} color={course.color} />
          </View>
          <Badge label={course.category} tone={course.color} variant="soft" />
          <H1>{course.title}</H1>
          <Body color={colors.mutedForeground}>{course.description}</Body>
          <View style={styles.meta}>
            <View style={styles.metaItem}>
              <Feather name="clock" size={14} color={colors.mutedForeground} />
              <Small color={colors.mutedForeground}>{course.duration}</Small>
            </View>
            <View style={styles.metaItem}>
              <Feather name="book-open" size={14} color={colors.mutedForeground} />
              <Small color={colors.mutedForeground}>{course.lessons.length} lessons</Small>
            </View>
            <Badge label={course.level} tone={course.color} variant="soft" />
          </View>
          {courseProgress > 0 && <ProgressBar value={courseProgress} total={100} color={course.color} />}
        </View>

        {isLocked && (
          <Card variant="outline" style={[styles.lockBanner, { backgroundColor: colors.accent + "18", borderColor: colors.accent + "44" }]}>
            <Feather name="lock" size={18} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Body color={colors.foreground}>Premium Course</Body>
              <Caption color={colors.mutedForeground}>Upgrade to Premium to access this course.</Caption>
            </View>
            <Button title="Upgrade" size="sm" fullWidth={false} style={{ backgroundColor: colors.accent }} onPress={() => router.push("/subscription")} />
          </Card>
        )}

        <View style={styles.lessons}>
          <H2 style={{ marginBottom: 0 }}>Lessons</H2>
          {course.lessons.map((lesson, idx) => {
            const isDone = progress.completedLessons.includes(lesson.id);
            const isAvailable = isDone || isLessonAvailable(course, lesson, progress, isLocked);
            const hasQuiz = lesson.hasQuiz;
            return (
              <Card
                key={lesson.id}
                variant="outline"
                pressable={isAvailable}
                onPress={() => isAvailable && router.push({ pathname: "/lesson/[id]", params: { id: lesson.id, courseId: course.id } })}
                style={[styles.lessonRow, { borderColor: isDone ? colors.success + "44" : colors.border }]}
              >
                <View style={[styles.lessonNum, { backgroundColor: isDone ? colors.success : isAvailable ? course.color + "22" : colors.muted }]}>
                  {isDone ? <Feather name="check" size={14} color={colors.primaryForeground} /> : <Body color={isAvailable ? course.color : colors.mutedForeground}>{idx + 1}</Body>}
                </View>
                <View style={styles.lessonInfo}>
                  <Body color={isAvailable ? colors.foreground : colors.mutedForeground}>{lesson.title}</Body>
                  <View style={styles.lessonMeta}>
                    <Feather name="clock" size={12} color={colors.mutedForeground} />
                    <Small color={colors.mutedForeground}>{lesson.duration}</Small>
                    {hasQuiz && <Badge label="Quiz" tone={colors.primary} variant="soft" />}
                  </View>
                </View>
                {!isAvailable ? <Feather name="lock" size={16} color={colors.mutedForeground} /> : <Feather name="chevron-right" size={16} color={colors.mutedForeground} />}
              </Card>
            );
          })}
        </View>

        {isComplete && (
          <Card variant="outline" style={[styles.completeBanner, { backgroundColor: colors.success + "18", borderColor: colors.success + "44" }]}>
            <Feather name="check-circle" size={22} color={colors.success} />
            <Body color={colors.success}>Course Complete!</Body>
          </Card>
        )}

        {!isLocked && !isComplete && (
          <Button
            title={completedLessons.length > 0 ? "Continue Course" : "Start Course"}
            style={[styles.startBtn, { backgroundColor: course.color }]}
            onPress={() => {
              const nextLesson = course.lessons.find(l => !progress.completedLessons.includes(l.id));
              if (nextLesson) router.push({ pathname: "/lesson/[id]", params: { id: nextLesson.id, courseId: course.id } });
            }}
          />
        )}
      </ScrollView>
      <BottomTabBar active="learn" />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xxl },
  hero: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.md },
  backBtn: { alignSelf: "flex-start", marginBottom: spacing.xs },
  heroIcon: { width: 64, height: 64, borderRadius: radius.xl, alignItems: "center", justifyContent: "center" },
  meta: { flexDirection: "row", alignItems: "center", gap: spacing.md, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  lockBanner: { marginHorizontal: spacing.xl, flexDirection: "row", alignItems: "center", gap: spacing.md },
  lessons: { paddingHorizontal: spacing.xl, gap: spacing.sm },
  lessonRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  lessonNum: { width: 34, height: 34, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  lessonInfo: { flex: 1, gap: spacing.xs },
  lessonMeta: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  completeBanner: { marginHorizontal: spacing.xl, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  startBtn: { marginHorizontal: spacing.xl },
});
