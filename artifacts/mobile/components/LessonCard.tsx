import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Course, Lesson } from "@/data/seed";
import { useColors } from "@/hooks/useColors";
import { AppText as Text } from "@/components/AppText";

interface Props {
  lesson: Lesson;
  course: Course;
  status: "available" | "completed";
  onPress: () => void;
}

export default function LessonCard({ lesson, course, status, onPress }: Props) {
  const colors = useColors();

  const statusConfig = {
    available: { label: "Start", bg: colors.primary, color: "#fff" },
    completed: { label: "Completed", bg: colors.success, color: "#fff" },
  }[status];

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`${lesson.title}, ${statusConfig.label}`}
    >
      <View style={[styles.iconWrap, { backgroundColor: course.color + "22" }]}>
        <Feather name={course.iconName as never} size={22} color={course.color} />
      </View>
      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]} numberOfLines={1}>{lesson.title}</Text>
        </View>
        <Text style={[styles.desc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>{lesson.content}</Text>
        <View style={styles.footer}>
          <View style={styles.metaRow}>
            <Feather name="clock" size={12} color={colors.mutedForeground} />
            <Text style={[styles.meta, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{lesson.duration}</Text>
            <View style={[styles.catPill, { backgroundColor: course.color + "22" }]}>
              <Text style={[styles.catText, { color: course.color, fontFamily: "Inter_500Medium" }]}>{course.title}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            {status === "completed" && <Feather name="check" size={11} color="#fff" />}
            <Text style={[styles.statusText, { color: statusConfig.color, fontFamily: "Inter_600SemiBold" }]}>{statusConfig.label}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 10, alignItems: "flex-start" },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 2 },
  content: { flex: 1, gap: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 15, flex: 1 },
  desc: { fontSize: 13, lineHeight: 18 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  meta: { fontSize: 12 },
  catPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  catText: { fontSize: 11 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusText: { fontSize: 12 },
});
