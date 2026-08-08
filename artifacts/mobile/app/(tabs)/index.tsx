import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useRef } from "react";
import { Platform, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useAuth } from "@/context/AuthContext";
import { useFamily } from "@/context/FamilyContext";
import { CHALLENGES } from "@/data/seed";
import ChallengeCard from "@/components/ChallengeCard";
import CourseCard from "@/components/CourseCard";
import LessonCard from "@/components/LessonCard";
import TipCard from "@/components/TipCard";
import { Avatar, Body, Card, H1, SectionHeader, Small } from "@/components/primitives";
import { useColors } from "@/hooks/useColors";
import { useCurriculum } from "@/hooks/useCurriculum";
import { useWeeklyTips } from "@/hooks/useWeeklyTips";
import { spacing } from "@/constants/spacing";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { family, progress } = useFamily();
  const { courses: COURSES } = useCurriculum();
  const { tips: WEEKLY_TIPS } = useWeeklyTips();
  const [refreshing, setRefreshing] = React.useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, []),
  );

  const weeksSinceCreation = user?.createdAt
    ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / WEEK_MS)
    : 0;
  const tip = WEEKLY_TIPS[weeksSinceCreation % WEEKLY_TIPS.length] ?? WEEKLY_TIPS[0]!;

  const activeChallenges = CHALLENGES.filter(c => progress.activeChallenges.includes(c.id));
  const recentCourses = COURSES.filter(c => (progress.courseProgress[c.id] ?? 0) > 0 && (progress.courseProgress[c.id] ?? 0) < 100).slice(0, 3);
  const startingLessons = COURSES.filter(c => !c.isPremium && c.lessons.length > 0)
    .slice(0, 3)
    .map(course => ({ course, lesson: course.lessons[0]! }));
  const completedCount = Object.values(progress.courseProgress).filter(p => p === 100).length;
  const totalLessons = progress.completedLessons.length;
  const earnedBadges = progress.earnedBadges.length;

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const stats: { label: string; value: number; icon: React.ComponentProps<typeof Feather>["name"]; color: string }[] = [
    { label: "Courses", value: completedCount, icon: "book-open", color: colors.primary },
    { label: "Lessons", value: totalLessons, icon: "check-circle", color: colors.success },
    { label: "Badges", value: earnedBadges, icon: "award", color: colors.accent },
  ];

  return (
    <ScrollView
      ref={scrollRef}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: topPad + spacing.lg, paddingBottom: bottomPad + 100 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.header}>
        <View>
          <Small color={colors.mutedForeground}>Good morning,</Small>
          <H1 style={{ marginTop: 2 }}>{user?.name ?? "Parent"}</H1>
          {family && <Body color={colors.primary} style={{ marginTop: 2 }}>{family.name}</Body>}
        </View>
        <Avatar initial={user?.name?.[0] ?? "P"} onPress={() => router.push("/(tabs)/profile")} />
      </View>

      <View style={styles.statsRow}>
        {stats.map(stat => (
          <Card key={stat.label} variant="outline" style={styles.statCard}>
            <Feather name={stat.icon} size={18} color={stat.color} />
            <H1 style={styles.statValue}>{stat.value}</H1>
            <Small color={colors.mutedForeground}>{stat.label}</Small>
          </Card>
        ))}
      </View>

      <TipCard tip={tip} />

      {activeChallenges.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Active Challenges" action="See all" onAction={() => router.push("/(tabs)/learn")} />
          {activeChallenges.slice(0, 2).map(challenge => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              status="active"
              onPress={() => router.push({ pathname: "/challenge/[id]", params: { id: challenge.id } })}
            />
          ))}
        </View>
      )}

      {recentCourses.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Continue Learning" action="View all" onAction={() => router.push("/(tabs)/learn")} />
          {recentCourses.map(course => (
            <CourseCard
              key={course.id}
              course={course}
              progress={progress.courseProgress[course.id] ?? 0}
              compact
              onPress={() => router.push({ pathname: "/course/[id]", params: { id: course.id } })}
            />
          ))}
        </View>
      )}

      {recentCourses.length === 0 && activeChallenges.length === 0 && (
        <View style={styles.section}>
          <SectionHeader title="Start Your Journey" action="Browse all" onAction={() => router.push("/(tabs)/learn")} />
          {startingLessons.map(({ course, lesson }) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              course={course}
              status={progress.completedLessons.includes(lesson.id) ? "completed" : "available"}
              onPress={() => router.push({ pathname: "/lesson/[id]", params: { id: lesson.id, courseId: course.id } })}
            />
          ))}
        </View>
      )}

      <View style={styles.section}>
        <SectionHeader title="Family Challenges" action="View all" onAction={() => router.push("/(tabs)/learn")} />
        {CHALLENGES.filter(c => !c.isPremium && !progress.completedChallenges.includes(c.id) && !progress.activeChallenges.includes(c.id)).slice(0, 2).map(challenge => (
          <ChallengeCard
            key={challenge.id}
            challenge={challenge}
            status="available"
            onPress={() => router.push({ pathname: "/challenge/[id]", params: { id: challenge.id } })}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl, gap: spacing.xxl },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  statsRow: { flexDirection: "row", gap: spacing.md },
  statCard: { flex: 1, alignItems: "center", gap: spacing.xs },
  statValue: { marginTop: 0 },
  section: { gap: spacing.md },
});
