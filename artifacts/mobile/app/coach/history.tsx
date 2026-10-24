import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Alert, FlatList, Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Body, Card, EmptyState, H2, Small } from "@/components/primitives";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/radius";
import { useColors } from "@/hooks/useColors";
import { useCoach, type CoachConversation } from "@/context/CoachContext";
import { formatRelativeTime } from "@/lib/formatRelativeTime";

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
        <H2 style={{ marginBottom: 0 }}>Coach History</H2>
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
            <Card variant="outline" style={styles.row} padding={spacing.md} pressable onPress={() => openConversation(item.id)}>
              <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
                <Feather name="message-circle" size={18} color={colors.primary} />
              </View>
              <View style={styles.content}>
                <Body color={colors.foreground} numberOfLines={1}>{item.title}</Body>
                {lastMessage && (
                  <Small color={colors.mutedForeground} numberOfLines={1} style={{ fontSize: 13 }}>
                    {lastMessage.content}
                  </Small>
                )}
                <Small color={colors.mutedForeground}>{formatRelativeTime(item.updatedAt)}</Small>
              </View>
              <TouchableOpacity onPress={() => confirmDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.deleteBtn}>
                <Feather name="trash-2" size={16} color={colors.destructive} />
              </TouchableOpacity>
            </Card>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  listContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.md, flexGrow: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  iconWrap: { width: 40, height: 40, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  content: { flex: 1, gap: 2 },
  deleteBtn: { padding: spacing.xs },
});
