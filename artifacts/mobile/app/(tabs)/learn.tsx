import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFamily } from "@/context/FamilyContext";
import { CHALLENGES, COURSES } from "@/data/seed";
import ChallengeCard from "@/components/ChallengeCard";
import CourseCard from "@/components/CourseCard";
import { EmptyState, SectionHeader } from "@/components/UI";
import { useColors } from "@/hooks/useColors";

const TABS = ["Courses", "Challenges"] as const;
const CATEGORIES = ["All", "Safety", "Social", "Privacy", "Technology", "Gaming", "Wellness"] as const;

export default function LearnScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { progress } = useFamily();
  const [activeTab, setActiveTab] = useState<"Courses" | "Challenges">("Courses");
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

  const handleTabChange = (tab: "Courses" | "Challenges") => {
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
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: bottomPad + 100 }]}
      showsVerticalScrollIndicator={false}
      stickyHeaderIndices={[0]}
    >
      <View style={[styles.stickyHeader, { backgroundColor: colors.background }]}>
        <Text style={[styles.pageTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Learn</Text>
        <View style={[styles.tabRow, { backgroundColor: colors.muted }]}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && { backgroundColor: colors.card }]}
              onPress={() => handleTabChange(tab)}
            >
              <Text style={[styles.tabText, { color: activeTab === tab ? colors.foreground : colors.mutedForeground, fontFamily: activeTab === tab ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
        {visibleCategories.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.catBtn, { backgroundColor: activeCategory === cat ? colors.primary : colors.card, borderColor: activeCategory === cat ? colors.primary : colors.border }]}
            onPress={() => setActiveCategory(cat)}
          >
            <Text style={[styles.catText, { color: activeCategory === cat ? "#FFFFFF" : colors.foreground, fontFamily: "Inter_500Medium" }]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

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
  content: { gap: 16 },
  stickyHeader: { paddingHorizontal: 20, paddingBottom: 12, gap: 14 },
  pageTitle: { fontSize: 28 },
  tabRow: { flexDirection: "row", borderRadius: 12, padding: 3 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  tabText: { fontSize: 14 },
  categoryScroll: { paddingHorizontal: 20, gap: 8 },
  catBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  catText: { fontSize: 13 },
  list: { paddingHorizontal: 20, gap: 4 },
});
