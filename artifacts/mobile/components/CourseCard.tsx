import React from "react";
import { StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { Course } from "@/data/seed";
import { Badge, Body, Card, Caption, H3, ProgressBar, Small } from "@/components/primitives";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/radius";
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
      <Card
        variant="outline"
        pressable
        onPress={onPress}
        style={styles.compact}
        testID={`course-card-${course.id}`}
      >
        <View style={[styles.compactIcon, { backgroundColor: course.color + "22" }]}>
          <Feather name={course.iconName as never} size={20} color={course.color} />
        </View>
        <View style={styles.compactContent}>
          <Body color={colors.foreground} numberOfLines={1}>{course.title}</Body>
          <Small color={colors.mutedForeground}>{course.duration} · {course.lessons.length} lessons</Small>
          <ProgressBar value={progress} total={100} color={course.color} />
        </View>
        {course.isPremium && !isComplete && <Badge label="PRO" tone={colors.warning} variant="solid" icon="lock" />}
        {isComplete && <Feather name="check-circle" size={20} color={colors.success} />}
      </Card>
    );
  }

  return (
    <Card variant="outline" pressable onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconBg, { backgroundColor: course.color + "22" }]}>
          <Feather name={course.iconName as never} size={24} color={course.color} />
        </View>
        <View style={styles.meta}>
          <Caption color={course.color}>{course.category}</Caption>
          <View style={styles.badges}>
            <Badge label={course.level} tone={colors.mutedForeground} variant="soft" />
            {course.isPremium && <Badge label="PRO" tone={colors.warning} variant="solid" icon="lock" />}
          </View>
        </View>
      </View>
      <H3>{course.title}</H3>
      <Body color={colors.mutedForeground} numberOfLines={2}>{course.description}</Body>
      <View style={styles.footer}>
        <View style={styles.stats}>
          <Feather name="clock" size={13} color={colors.mutedForeground} />
          <Small color={colors.mutedForeground}>{course.duration}</Small>
          <Feather name="book-open" size={13} color={colors.mutedForeground} />
          <Small color={colors.mutedForeground}>{course.lessons.length} lessons</Small>
        </View>
        {isComplete ? (
          <Badge label="Complete" tone={colors.success} variant="soft" icon="check" />
        ) : (
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <ProgressBar value={progress} total={100} color={course.color} />
          </View>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  header: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  iconBg: { width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  meta: { flex: 1, gap: spacing.xs },
  badges: { flexDirection: "row", gap: spacing.xs, alignItems: "center" },
  footer: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  stats: { flexDirection: "row", alignItems: "center", gap: 5 },
  compact: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  compactIcon: { width: 40, height: 40, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  compactContent: { flex: 1, gap: spacing.xs },
});
