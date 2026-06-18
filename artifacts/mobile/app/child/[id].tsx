import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFamily } from "@/context/FamilyContext";
import { AGE_BANDS, AgeBand } from "@/data/seed";
import { useColors } from "@/hooks/useColors";

const AGE_COLORS: Record<string, string> = { "6-9": "#4CAF7D", "10-13": "#4A90A4", "14-17": "#7B5EA7" };

export default function ChildProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { family, removeChild, updateChild } = useFamily();

  const child = family?.children.find(c => c.id === id);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(child?.name ?? "");
  const [ageBand, setAgeBand] = useState<AgeBand>(child?.ageBand ?? "10-13");

  if (!child) { router.back(); return null; }

  const avatarColor = ["#3A7D6B", "#4A90A4", "#E07B39", "#8E44AD", "#E91E8C"][child.name.charCodeAt(0) % 5] ?? "#3A7D6B";
  const ageBandColor = AGE_COLORS[child.ageBand] ?? colors.primary;

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert("Name Required", "Please enter a name."); return; }
    try {
      await updateChild(child.id, { name: name.trim(), ageBand });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditing(false);
    } catch (e: any) {
      console.error("[child] save error:", e?.message || e);
      Alert.alert("Error", "Failed to save changes. Please try again.");
    }
  };

  const handleDelete = () => {
    Alert.alert("Remove Child", `Remove ${child.name} from your family profile?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => {
        try {
          await removeChild(child.id);
          router.back();
        } catch (e: any) {
          console.error("[child] delete error:", e?.message || e);
          Alert.alert("Error", "Failed to remove child. Please try again.");
        }
      } },
    ]);
  };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setEditing(!editing)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name={editing ? "x" : "edit-2"} size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.profile}>
        <View style={[styles.avatar, { backgroundColor: avatarColor + "22", borderColor: avatarColor + "44" }]}>
          <Text style={[styles.initial, { color: avatarColor, fontFamily: "Inter_700Bold" }]}>{child.name[0]?.toUpperCase() ?? "?"}</Text>
        </View>
        {editing ? (
          <TextInput
            style={[styles.nameInput, { color: colors.foreground, borderColor: colors.primary, fontFamily: "Inter_700Bold" }]}
            value={name}
            onChangeText={setName}
            autoFocus
            autoCapitalize="words"
          />
        ) : (
          <Text style={[styles.childName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{child.name}</Text>
        )}
        <View style={[styles.agePill, { backgroundColor: ageBandColor + "22" }]}>
          <Text style={[styles.ageText, { color: ageBandColor, fontFamily: "Inter_600SemiBold" }]}>Ages {child.ageBand}</Text>
        </View>
      </View>

      {editing && (
        <View style={styles.editSection}>
          <Text style={[styles.editLabel, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Age Band</Text>
          <View style={styles.ageBandRow}>
            {AGE_BANDS.map(band => (
              <TouchableOpacity
                key={band}
                style={[styles.bandBtn, { borderColor: ageBand === band ? colors.primary : colors.border, backgroundColor: ageBand === band ? colors.secondary : "transparent" }]}
                onPress={() => setAgeBand(band)}
              >
                <Text style={[styles.bandText, { color: ageBand === band ? colors.primary : colors.mutedForeground, fontFamily: ageBand === band ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                  Ages {band}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave} activeOpacity={0.85}>
            <Text style={[styles.saveBtnText, { fontFamily: "Inter_700Bold" }]}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.infoSection}>
        <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Age-Appropriate Guidance</Text>
        {child.ageBand === "6-9" && (
          <View style={[styles.guidanceCard, { backgroundColor: "#4CAF7D" + "18", borderColor: "#4CAF7D44" }]}>
            <Text style={[styles.guidanceTitle, { color: "#4CAF7D", fontFamily: "Inter_600SemiBold" }]}>Ages 6-9: Foundation Building</Text>
            <Text style={[styles.guidanceText, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
              At this age, focus on basic digital safety: no sharing personal information, always asking permission before downloading, and understanding that not everything online is real or true.{"\n\n"}Recommended: Cyberbullying Prevention, Healthy Screen Habits
            </Text>
          </View>
        )}
        {child.ageBand === "10-13" && (
          <View style={[styles.guidanceCard, { backgroundColor: "#4A90A4" + "18", borderColor: "#4A90A444" }]}>
            <Text style={[styles.guidanceTitle, { color: "#4A90A4", fontFamily: "Inter_600SemiBold" }]}>Ages 10-13: Social Navigation</Text>
            <Text style={[styles.guidanceText, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
              This age group begins social media exploration and gaming. Key topics: understanding social media age limits, online friendship safety, recognizing scams, and building digital footprint awareness.{"\n\n"}Recommended: Social Media Readiness, Online Scam Awareness, Digital Footprints
            </Text>
          </View>
        )}
        {child.ageBand === "14-17" && (
          <View style={[styles.guidanceCard, { backgroundColor: "#7B5EA7" + "18", borderColor: "#7B5EA744" }]}>
            <Text style={[styles.guidanceTitle, { color: "#7B5EA7", fontFamily: "Inter_600SemiBold" }]}>Ages 14-17: Digital Independence</Text>
            <Text style={[styles.guidanceText, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
              Teens need preparation for greater digital independence. Key topics: understanding online predator tactics, AI literacy, digital reputation management, and privacy in a data-driven world.{"\n\n"}Recommended: AI Safety & Literacy, Online Predator Awareness, Digital Footprints
            </Text>
          </View>
        )}
      </View>

      <View style={styles.conversationSection}>
        <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Conversation Starters</Text>
        {[
          "What's your favorite thing to do online right now?",
          "Has anything ever made you feel uncomfortable online?",
          "Do you know what to do if someone asks for personal information?",
          "How do you decide who you want to be friends with online?",
        ].map(starter => (
          <View key={starter} style={[styles.starterRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.starterDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.starterText, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>{starter}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={[styles.deleteBtn, { borderColor: colors.destructive + "44" }]} onPress={handleDelete}>
        <Feather name="trash-2" size={16} color={colors.destructive} />
        <Text style={[styles.deleteText, { color: colors.destructive, fontFamily: "Inter_500Medium" }]}>Remove from Profile</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 24 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  profile: { alignItems: "center", gap: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  initial: { fontSize: 36 },
  nameInput: { fontSize: 26, borderBottomWidth: 2, paddingBottom: 4, textAlign: "center", minWidth: 150 },
  childName: { fontSize: 26 },
  agePill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  ageText: { fontSize: 14 },
  editSection: { gap: 12 },
  editLabel: { fontSize: 14 },
  ageBandRow: { flexDirection: "row", gap: 8 },
  bandBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, alignItems: "center" },
  bandText: { fontSize: 13 },
  saveBtn: { borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  saveBtnText: { color: "#FFFFFF", fontSize: 15 },
  infoSection: { gap: 10 },
  sectionTitle: { fontSize: 18 },
  guidanceCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 8 },
  guidanceTitle: { fontSize: 15 },
  guidanceText: { fontSize: 14, lineHeight: 21 },
  conversationSection: { gap: 8 },
  starterRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  starterDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6, flexShrink: 0 },
  starterText: { flex: 1, fontSize: 14, lineHeight: 20 },
  deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, borderWidth: 1, paddingVertical: 14 },
  deleteText: { fontSize: 15 },
});
