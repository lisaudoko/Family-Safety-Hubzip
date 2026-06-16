import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Child } from "@/context/FamilyContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  child: Child;
  onPress: () => void;
}

const AGE_COLORS: Record<string, string> = {
  "6-9": "#4CAF7D",
  "10-13": "#4A90A4",
  "14-17": "#7B5EA7",
};

const AVATAR_COLORS = ["#3A7D6B", "#4A90A4", "#E07B39", "#8E44AD", "#E91E8C", "#F39C12"];

export default function ChildCard({ child, onPress }: Props) {
  const colors = useColors();
  const avatarColor = AVATAR_COLORS[child.name.charCodeAt(0) % AVATAR_COLORS.length] ?? "#3A7D6B";
  const ageBandColor = AGE_COLORS[child.ageBand] ?? colors.primary;

  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.avatar, { backgroundColor: avatarColor + "22", borderColor: avatarColor + "44" }]}>
        <Text style={[styles.initial, { color: avatarColor, fontFamily: "Inter_700Bold" }]}>{child.name[0]?.toUpperCase() ?? "?"}</Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{child.name}</Text>
        <View style={[styles.agePill, { backgroundColor: ageBandColor + "22" }]}>
          <Text style={[styles.ageText, { color: ageBandColor, fontFamily: "Inter_500Medium" }]}>Ages {child.ageBand}</Text>
        </View>
      </View>
      <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  initial: { fontSize: 20 },
  info: { flex: 1, gap: 4 },
  name: { fontSize: 16 },
  agePill: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  ageText: { fontSize: 12 },
});
