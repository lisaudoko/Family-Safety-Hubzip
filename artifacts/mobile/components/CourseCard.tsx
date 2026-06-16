import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Course } from "@/data/seed";
import { PremiumBadge, ProgressBar } from "@/components/UI";
import { useColors } from "@/hooks/useColors";

interface Props {
  course: Course;
  progress: number;
  onPress: () => void;
  compact?: boolean;
}

export default function CourseCard({ course, progress, onPress, compact }: Props) {
  const colors = useColors();
  const isComplete = progress === 100;

  if (compact) {
    return (
      <TouchableOpacity style={[styles.compact, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={onPress} activeOpacity={0.75}>
        <View style={[styles.compactIcon, { backgroundColor: course.color + "22" }]}>
          <Feather name={course.iconName as never} size={20} color={course.color} />
        </View>
        <View style={styles.compactContent}>
          <Text style={[styles.compactTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>{course.title}</Text>
          <Text style={[styles.compactMeta, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{course.duration} · {course.lessons.length} lessons</Text>
          <ProgressBar value={progress} total={100} color={course.color} />
        </View>
        {course.isPremium && !isComplete && <PremiumBadge />}
        {isComplete && <Feather name="check-circle" size={20} color={colors.success} />}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.header}>
        <View style={[styles.iconBg, { backgroundColor: course.color + "22" }]}>
          <Feather name={course.iconName as never} size={24} color={course.color} />
        </View>
        <View style={styles.meta}>
          <Text style={[styles.category, { color: course.color, fontFamily: "Inter_500Medium" }]}>{course.category}</Text>
          <View style={styles.badges}>
            <View style={[styles.levelBadge, { backgroundColor: colors.muted }]}>
              <Text style={[styles.levelText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>{course.level}</Text>
            </View>
            {course.isPremium && <PremiumBadge />}
          </View>
        </View>
      </View>
      <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{course.title}</Text>
      <Text style={[styles.description, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>{course.description}</Text>
      <View style={styles.footer}>
        <View style={styles.stats}>
          <Feather name="clock" size={13} color={colors.mutedForeground} />
          <Text style={[styles.statText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{course.duration}</Text>
          <Feather name="book-open" size={13} color={colors.mutedForeground} />
          <Text style={[styles.statText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{course.lessons.length} lessons</Text>
        </View>
        {isComplete ? (
          <View style={[styles.completePill, { backgroundColor: colors.success + "22" }]}>
            <Feather name="check" size={12} color={colors.success} />
            <Text style={[styles.completeText, { color: colors.success, fontFamily: "Inter_600SemiBold" }]}>Complete</Text>
          </View>
        ) : (
          <View style={{ flex: 1, marginLeft: 12 }}>
            <ProgressBar value={progress} total={100} color={course.color} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, gap: 10 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  iconBg: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  meta: { flex: 1, gap: 4 },
  category: { fontSize: 12 },
  badges: { flexDirection: "row", gap: 6, alignItems: "center" },
  levelBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  levelText: { fontSize: 11 },
  title: { fontSize: 17 },
  description: { fontSize: 13, lineHeight: 19 },
  footer: { flexDirection: "row", alignItems: "center", gap: 8 },
  stats: { flexDirection: "row", alignItems: "center", gap: 5 },
  statText: { fontSize: 12 },
  completePill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  completeText: { fontSize: 12 },
  compact: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  compactIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  compactContent: { flex: 1, gap: 4 },
  compactTitle: { fontSize: 14 },
  compactMeta: { fontSize: 12 },
});
