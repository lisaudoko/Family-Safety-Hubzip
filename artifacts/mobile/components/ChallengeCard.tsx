import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Challenge } from "@/data/seed";
import { PremiumBadge } from "@/components/UI";
import { useColors } from "@/hooks/useColors";

interface Props {
  challenge: Challenge;
  status: "available" | "active" | "completed";
  onPress: () => void;
}

export default function ChallengeCard({ challenge, status, onPress }: Props) {
  const colors = useColors();

  const statusConfig = {
    available: { label: "Start", bg: colors.primary, color: "#fff" },
    active: { label: "In Progress", bg: colors.accent, color: "#fff" },
    completed: { label: "Completed", bg: colors.success, color: "#fff" },
  }[status];

  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.iconWrap, { backgroundColor: challenge.color + "22" }]}>
        <Feather name={challenge.iconName as never} size={22} color={challenge.color} />
      </View>
      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]} numberOfLines={1}>{challenge.title}</Text>
          {challenge.isPremium && status === "available" && <PremiumBadge />}
        </View>
        <Text style={[styles.desc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>{challenge.description}</Text>
        <View style={styles.footer}>
          <View style={styles.metaRow}>
            <Feather name="clock" size={12} color={colors.mutedForeground} />
            <Text style={[styles.meta, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{challenge.duration}</Text>
            <View style={[styles.catPill, { backgroundColor: challenge.color + "22" }]}>
              <Text style={[styles.catText, { color: challenge.color, fontFamily: "Inter_500Medium" }]}>{challenge.category}</Text>
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
