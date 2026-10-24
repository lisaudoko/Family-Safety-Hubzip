import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useFamily } from "@/context/FamilyContext";
import { CHALLENGES } from "@/data/seed";
import { useCurriculum } from "@/hooks/useCurriculum";
import ChallengeCard from "@/components/ChallengeCard";
import CourseCard from "@/components/CourseCard";
import { AssessmentsPanel } from "@/components/AssessmentsPanel";
import { EmptyState, H1, SectionHeader, SegmentedControl, Small } from "@/components/primitives";
import { useColors } from "@/hooks/useColors";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/radius";
import { fontFamily } from "@/constants/typography";

const TABS = [
  { key: "Courses", label: "Courses" },
  { key: "Challenges", label: "Challenges" },
  { key: "Assessments", label: "Assessments" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const CATEGORIES = ["All", "Safety", "Social", "Privacy", "Technology", "Gaming", "Wellness"] as const;

export default function LearnScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { progress } = useFamily();
  const { courses: COURSES } = useCurriculum();
  const [activeTab, setActiveTab] = useState<TabKey>("Courses");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, []),
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  // Only show categories that have at least one item for the active tab,
  // so users never tap into a chip that silently shows nothing.
  const sourceItems = activeTab === "Courses" ? COURSES : CHALLENGES;
  const visibleCategories = CATEGORIES.filter(
    cat => cat === "All" || sourceItems.some(i => i.category === cat),
  );

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    const items = tab === "Courses" ? COURSES : CHALLENGES;
    if (activeCategory !== "All" && !items.some(i => i.category === activeCategory)) {
      setActiveCategory("All");
    }
  };

  const filteredCourses = COURSES.filter(c => activeCategory === "All" || c.category === activeCategory);
  const filteredChallenges = CHALLENGES.filter(c => activeCategory === "All" || c.category === activeCategory);

  const getChallengeStatus = (id: string): "available" | "active" | "completed" => {
    if (progress.completedChallenges.includes(id)) return "completed";
    if (progress.activeChallenges.includes(id)) return "active";
    return "available";
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: topPad + spacing.lg, paddingBottom: bottomPad + 100 }]}
      showsVerticalScrollIndicator={false}
      stickyHeaderIndices={[0]}
    >
      <View style={[styles.stickyHeader, { backgroundColor: colors.background }]}>
        <H1>Learn</H1>
        <SegmentedControl segments={TABS} value={activeTab} onChange={handleTabChange} />
      </View>

      {activeTab !== "Assessments" && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {visibleCategories.map(cat => {
            const active = activeCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.catBtn, { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border }]}
                onPress={() => setActiveCategory(cat)}
              >
                <Small style={{ color: active ? colors.primaryForeground : colors.foreground, fontFamily: fontFamily.medium }}>{cat}</Small>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {activeTab === "Assessments" && <AssessmentsPanel />}

      {activeTab === "Courses" && (
        <View style={styles.list}>
          <SectionHeader title={`${filteredCourses.length} ${activeCategory === "All" ? "Courses" : activeCategory + " Courses"}`} />
          {filteredCourses.length === 0 ? (
            <EmptyState
              icon="book-open"
              title="No courses here yet"
              subtitle="Try a different category to find more courses."
            />
          ) : (
            filteredCourses.map(course => (
              <CourseCard
                key={course.id}
                course={course}
                progress={progress.courseProgress[course.id] ?? 0}
                onPress={() => router.push({ pathname: "/course/[id]", params: { id: course.id } })}
              />
            ))
          )}
        </View>
      )}

      {activeTab === "Challenges" && (
        <View style={styles.list}>
          <SectionHeader title={`${filteredChallenges.length} Family Challenges`} />
          {filteredChallenges.length === 0 ? (
            <EmptyState
              icon="flag"
              title="No challenges here yet"
              subtitle="Try a different category to find more challenges."
            />
          ) : (
            filteredChallenges.map(challenge => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                status={getChallengeStatus(challenge.id)}
                onPress={() => router.push({ pathname: "/challenge/[id]", params: { id: challenge.id } })}
              />
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  stickyHeader: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md, gap: spacing.md },
  categoryScroll: { paddingHorizontal: spacing.xl, gap: spacing.sm },
  catBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1 },
  list: { paddingHorizontal: spacing.xl, gap: spacing.md },
});
