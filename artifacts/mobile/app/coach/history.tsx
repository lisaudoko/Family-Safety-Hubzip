import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Alert, FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/UI";
import { useColors } from "@/hooks/useColors";
import { useCoach, type CoachConversation } from "@/context/CoachContext";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function CoachHistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { conversations, loadConversation, deleteConversation } = useCoach();

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const openConversation = (id: string) => {
    loadConversation(id);
    router.back();
  };

  const confirmDelete = (conversation: CoachConversation) => {
    const doDelete = () => void deleteConversation(conversation.id);
    if (Platform.OS === "web") {
      if (window.confirm(`Delete "${conversation.title}"?`)) doDelete();
      return;
    }
    Alert.alert("Delete Conversation", `Delete "${conversation.title}"? This can't be undone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: doDelete },
    ]);
  };

  const sorted = [...conversations].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: topPad }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Coach History</Text>
        <View style={{ width: 22 }} />
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState icon="clock" title="No past conversations yet" subtitle="Conversations you start with the Coach will show up here." />
        }
        renderItem={({ item }) => {
          const lastMessage = item.messages[item.messages.length - 1];
          return (
            <TouchableOpacity
              style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => openConversation(item.id)}
              activeOpacity={0.75}
            >
              <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
                <Feather name="message-circle" size={18} color={colors.primary} />
              </View>
              <View style={styles.content}>
                <Text style={[styles.rowTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
                  {item.title}
                </Text>
                {lastMessage && (
                  <Text style={[styles.preview, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
                    {lastMessage.content}
                  </Text>
                )}
                <Text style={[styles.timestamp, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {timeAgo(item.updatedAt)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => confirmDelete(item)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.deleteBtn}
              >
                <Feather name="trash-2" size={16} color={colors.destructive} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 18 },
  listContent: { paddingHorizontal: 20, paddingBottom: 32, gap: 10, flexGrow: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, borderWidth: 1 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  content: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15 },
  preview: { fontSize: 13 },
  timestamp: { fontSize: 11, marginTop: 2 },
  deleteBtn: { padding: 6 },
});
