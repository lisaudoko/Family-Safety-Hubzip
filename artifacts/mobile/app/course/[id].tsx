import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useFamily } from "@/context/FamilyContext";
import { useAuth } from "@/context/AuthContext";
import { COURSES } from "@/data/seed";
import { CategoryPill, ProgressBar } from "@/components/UI";
import { useColors } from "@/hooks/useColors";

export default function CourseDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { progress } = useFamily();

  const course = COURSES.find(c => c.id === id);
  if (!course) { router.back(); return null; }

  const isLocked = course.isPremium && !user?.isPremium;
  const completedLessons = course.lessons.filter(l => progress.completedLessons.includes(l.id));
  const courseProgress = progress.courseProgress[course.id] ?? 0;
  const isComplete = courseProgress === 100;

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
      <View style={[styles.hero, { backgroundColor: course.color + "18", paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color={course.color} />
        </TouchableOpacity>
        <View style={[styles.heroIcon, { backgroundColor: course.color + "33" }]}>
          <Feather name={course.iconName as never} size={36} color={course.color} />
        </View>
        <CategoryPill label={course.category} color={course.color} />
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{course.title}</Text>
        <Text style={[styles.description, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{course.description}</Text>
        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Feather name="clock" size={14} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{course.duration}</Text>
          </View>
          <View style={styles.metaItem}>
            <Feather name="book-open" size={14} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{course.lessons.length} lessons</Text>
          </View>
          <View style={[styles.levelTag, { backgroundColor: course.color + "22" }]}>
            <Text style={[styles.levelText, { color: course.color, fontFamily: "Inter_500Medium" }]}>{course.level}</Text>
          </View>
        </View>
        {courseProgress > 0 && <ProgressBar value={courseProgress} total={100} color={course.color} />}
      </View>

      {isLocked && (
        <View style={[styles.lockBanner, { backgroundColor: colors.accent + "18", borderColor: colors.accent + "44" }]}>
          <Feather name="lock" size={18} color={colors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.lockTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Premium Course</Text>
            <Text style={[styles.lockDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Upgrade to Premium to access this course.</Text>
          </View>
          <TouchableOpacity style={[styles.lockBtn, { backgroundColor: colors.accent }]} onPress={() => router.push("/subscription")}>
            <Text style={[styles.lockBtnText, { fontFamily: "Inter_600SemiBold" }]}>Upgrade</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.lessons}>
        <Text style={[styles.lessonsTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Lessons</Text>
        {course.lessons.map((lesson, idx) => {
          const isDone = progress.completedLessons.includes(lesson.id);
          const isAvailable = !isLocked || idx === 0;
          const hasQuiz = lesson.hasQuiz;
          return (
            <TouchableOpacity
              key={lesson.id}
              style={[styles.lessonRow, { backgroundColor: colors.card, borderColor: isDone ? colors.success + "44" : colors.border }]}
              onPress={() => isAvailable && router.push({ pathname: "/lesson/[id]", params: { id: lesson.id, courseId: course.id } })}
              activeOpacity={isAvailable ? 0.75 : 1}
            >
              <View style={[styles.lessonNum, { backgroundColor: isDone ? colors.success : isAvailable ? course.color + "22" : colors.muted }]}>
                {isDone ? <Feather name="check" size={14} color="#FFFFFF" /> : <Text style={[styles.lessonNumText, { color: isAvailable ? course.color : colors.mutedForeground, fontFamily: "Inter_700Bold" }]}>{idx + 1}</Text>}
              </View>
              <View style={styles.lessonInfo}>
                <Text style={[styles.lessonTitle, { color: isAvailable ? colors.foreground : colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>{lesson.title}</Text>
                <View style={styles.lessonMeta}>
                  <Feather name="clock" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.lessonMetaText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{lesson.duration}</Text>
                  {hasQuiz && <View style={[styles.quizTag, { backgroundColor: colors.primary + "22" }]}><Text style={[styles.quizTagText, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>Quiz</Text></View>}
                </View>
              </View>
              {!isAvailable ? <Feather name="lock" size={16} color={colors.mutedForeground} /> : <Feather name="chevron-right" size={16} color={colors.mutedForeground} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {isComplete && (
        <View style={[styles.completeBanner, { backgroundColor: colors.success + "18", borderColor: colors.success + "44" }]}>
          <Feather name="check-circle" size={22} color={colors.success} />
          <Text style={[styles.completeText, { color: colors.success, fontFamily: "Inter_600SemiBold" }]}>Course Complete!</Text>
        </View>
      )}

      {!isLocked && !isComplete && (
        <TouchableOpacity
          style={[styles.startBtn, { backgroundColor: course.color }]}
          onPress={() => {
            const nextLesson = course.lessons.find(l => !progress.completedLessons.includes(l.id));
            if (nextLesson) router.push({ pathname: "/lesson/[id]", params: { id: nextLesson.id, courseId: course.id } });
          }}
          activeOpacity={0.85}
        >
          <Text style={[styles.startBtnText, { fontFamily: "Inter_700Bold" }]}>{completedLessons.length > 0 ? "Continue Course" : "Start Course"}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 24 },
  hero: { paddingHorizontal: 20, paddingBottom: 24, gap: 12 },
  backBtn: { alignSelf: "flex-start", marginBottom: 4 },
  heroIcon: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24 },
  description: { fontSize: 14, lineHeight: 21 },
  meta: { flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 13 },
  levelTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  levelText: { fontSize: 11 },
  lockBanner: { marginHorizontal: 20, borderRadius: 14, borderWidth: 1, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  lockTitle: { fontSize: 15, marginBottom: 2 },
  lockDesc: { fontSize: 13 },
  lockBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  lockBtnText: { color: "#FFFFFF", fontSize: 13 },
  lessons: { paddingHorizontal: 20, gap: 8 },
  lessonsTitle: { fontSize: 18 },
  lessonRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  lessonNum: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  lessonNumText: { fontSize: 15 },
  lessonInfo: { flex: 1, gap: 4 },
  lessonTitle: { fontSize: 14 },
  lessonMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  lessonMetaText: { fontSize: 12 },
  quizTag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  quizTagText: { fontSize: 11 },
  completeBanner: { marginHorizontal: 20, borderRadius: 14, borderWidth: 1, padding: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  completeText: { fontSize: 16 },
  startBtn: { marginHorizontal: 20, borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  startBtnText: { color: "#FFFFFF", fontSize: 16 },
});
