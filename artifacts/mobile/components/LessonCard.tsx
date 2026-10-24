import React from "react";
import { StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { Course, Lesson } from "@/data/seed";
import { useColors } from "@/hooks/useColors";
import { Badge, Body, Card, H3, Small } from "@/components/primitives";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/radius";

interface Props {
  lesson: Lesson;
  course: Course;
  status: "available" | "completed";
  onPress: () => void;
}

export default function LessonCard({ lesson, course, status, onPress }: Props) {
  const colors = useColors();

  const statusConfig = {
    available: { label: "Start", tone: colors.primary },
    completed: { label: "Completed", tone: colors.success },
  }[status];

  return (
    <Card variant="outline" pressable onPress={onPress} style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: course.color + "22" }]}>
        <Feather name={course.iconName as never} size={22} color={course.color} />
      </View>
      <View style={styles.content}>
        <H3 numberOfLines={1}>{lesson.title}</H3>
        <Body color={colors.mutedForeground} numberOfLines={2} style={styles.desc}>{lesson.content}</Body>
        <View style={styles.footer}>
          <View style={styles.metaRow}>
            <Feather name="clock" size={12} color={colors.mutedForeground} />
            <Small color={colors.mutedForeground}>{lesson.duration}</Small>
            <Badge label={course.title} tone={course.color} variant="soft" />
          </View>
          <Badge label={statusConfig.label} tone={statusConfig.tone} variant="solid" icon={status === "completed" ? "check" : undefined} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  iconWrap: { width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center", marginTop: 2 },
  content: { flex: 1, gap: spacing.xs },
  desc: { fontSize: 13, lineHeight: 18 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.xs },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
});
