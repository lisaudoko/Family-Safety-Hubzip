import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFamily } from "@/context/FamilyContext";
import { COURSES } from "@/data/seed";
import { useColors } from "@/hooks/useColors";

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

  const paragraphs = lesson.content.split("\n\n");

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
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
        {paragraphs.map((para, idx) => {
          const isListItem = para.startsWith("•");
          const isNumbered = /^\d+\./.test(para);
          if (para.startsWith("##")) {
            return <Text key={idx} style={[styles.heading, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{para.replace("## ", "")}</Text>;
          }
          return (
            <Text key={idx} style={[styles.paragraph, { color: colors.foreground, fontFamily: "Inter_400Regular", paddingLeft: isListItem || isNumbered ? 0 : 0 }]}>
              {para}
            </Text>
          );
        })}
      </View>

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
  body: { gap: 14 },
  heading: { fontSize: 18, marginTop: 6 },
  paragraph: { fontSize: 15, lineHeight: 24 },
  quizPreview: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  quizTitle: { fontSize: 15, marginBottom: 2 },
  quizDesc: { fontSize: 13 },
  completeBtn: { borderRadius: 16, paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
  completeBtnText: { fontSize: 16 },
});
