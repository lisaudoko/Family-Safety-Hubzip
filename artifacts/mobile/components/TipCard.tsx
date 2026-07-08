import React from "react";
import { StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { WeeklyTip } from "@/data/seed";
import { useColors } from "@/hooks/useColors";
import { AppText as Text } from "@/components/AppText";

interface Props {
  tip: WeeklyTip;
}

export default function TipCard({ tip }: Props) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.primary }]}>
      <View style={styles.header}>
        <View style={styles.labelRow}>
          <Feather name="zap" size={12} color="rgba(255,255,255,0.8)" />
          <Text style={[styles.label, { fontFamily: "Inter_600SemiBold" }]}>WEEKLY TIP</Text>
        </View>
      </View>
      <View style={[styles.iconWrap, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
        <Feather name={tip.iconName as never} size={20} color="#FFFFFF" />
      </View>
      <Text style={[styles.title, { fontFamily: "Inter_700Bold" }]}>{tip.title}</Text>
      <Text style={[styles.content, { fontFamily: "Inter_400Regular" }]}>{tip.content}</Text>
      <View style={[styles.categoryPill, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
        <Text style={[styles.category, { fontFamily: "Inter_500Medium" }]}>{tip.category}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 20, gap: 10 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  label: { color: "rgba(255,255,255,0.8)", fontSize: 11, letterSpacing: 1 },
  iconWrap: { alignSelf: "flex-start", width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  title: { color: "#FFFFFF", fontSize: 18, lineHeight: 24 },
  content: { color: "rgba(255,255,255,0.85)", fontSize: 14, lineHeight: 21 },
  categoryPill: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  category: { color: "rgba(255,255,255,0.9)", fontSize: 12 },
});
