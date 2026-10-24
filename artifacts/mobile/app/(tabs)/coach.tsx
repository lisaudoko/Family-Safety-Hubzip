import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useCoach, type ChatMessage } from "@/context/CoachContext";
import { Body, Caption, H1, Small } from "@/components/primitives";
import { spacing } from "@/constants/spacing";
import { radius } from "@/constants/radius";
import { shadow } from "@/constants/elevation";
import { fontFamily } from "@/constants/typography";

const WELCOME =
  "Hi! I'm your Digital Safety Coach. Ask me anything about screen time, social media, cyberbullying, online privacy, or raising digitally-aware kids. I'm here to help.";

const SUGGESTIONS = [
  "How much screen time is healthy for a 10-year-old?",
  "What are the warning signs of cyberbullying?",
  "When is my child ready for social media?",
  "How do I set up a family technology agreement?",
];

function CoachAvatar() {
  const colors = useColors();
  return (
    <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
      <Feather name="cpu" size={16} color={colors.primary} />
    </View>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const colors = useColors();
  const isUser = message.role === "user";
  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowCoach]}>
      {!isUser && <CoachAvatar />}
      <View
        style={[
          styles.bubble,
          isUser
            ? { backgroundColor: colors.primary, borderBottomRightRadius: 4 }
            : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderBottomLeftRadius: 4 },
        ]}
      >
        <Body color={isUser ? colors.primaryForeground : colors.foreground} style={styles.bubbleText}>
          {message.content}
        </Body>
      </View>
    </View>
  );
}

function TypingBubble() {
  const colors = useColors();
  return (
    <View style={[styles.row, styles.rowCoach]}>
      <CoachAvatar />
      <View style={[styles.bubble, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderBottomLeftRadius: 4 }]}>
        <Body color={colors.mutedForeground} style={styles.bubbleText}>Thinking…</Body>
      </View>
    </View>
  );
}

export default function CoachScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const [input, setInput] = useState("");
  const { activeMessages: messages, isSending: isPending, sendError: error, sendMessage, retry, startNewConversation } = useCoach();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const tabBarSpace = Platform.OS === "web" ? 84 : 49 + insets.bottom;

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isPending) return;
      setInput("");
      scrollToEnd();
      void sendMessage(trimmed).then(scrollToEnd);
    },
    [isPending, scrollToEnd, sendMessage],
  );

  const showSuggestions = messages.length === 0;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? topPad : 0}
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <H1 style={{ marginBottom: 0 }}>Coach</H1>
          <Small color={colors.mutedForeground} style={{ marginTop: 2 }}>Your digital safety advisor</Small>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push("/coach/history")}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="clock" size={18} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => { setInput(""); startNewConversation(); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="edit" size={18} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => <MessageBubble message={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={scrollToEnd}
        ListHeaderComponent={
          <View>
            <MessageBubble message={{ role: "assistant", content: WELCOME }} />
            {showSuggestions && (
              <View style={styles.suggestions}>
                <Caption color={colors.mutedForeground} style={styles.suggestionsLabel}>TRY ASKING</Caption>
                {SUGGESTIONS.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => send(s)}
                    disabled={isPending}
                  >
                    <Feather name="message-circle" size={14} color={colors.primary} />
                    <Body color={colors.foreground} style={styles.chipText}>{s}</Body>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        }
        ListFooterComponent={
          <View>
            {isPending && <TypingBubble />}
            {error && (
              <View style={styles.errorRow}>
                <Caption color={colors.destructive} style={{ textAlign: "center" }}>{error}</Caption>
                <TouchableOpacity
                  style={[styles.retryBtn, { backgroundColor: colors.secondary }]}
                  onPress={retry}
                >
                  <Feather name="refresh-cw" size={14} color={colors.primary} />
                  <Small style={{ color: colors.primary, fontFamily: fontFamily.semibold }}>Retry</Small>
                </TouchableOpacity>
              </View>
            )}
          </View>
        }
      />

      <View
        style={[
          styles.inputBar,
          { backgroundColor: colors.background, borderTopColor: colors.border, marginBottom: tabBarSpace },
        ]}
      >
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, fontFamily: fontFamily.regular }]}
          placeholder="Ask your coach…"
          placeholderTextColor={colors.mutedForeground}
          value={input}
          onChangeText={setInput}
          multiline
          onSubmitEditing={() => send(input)}
          editable={!isPending}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: input.trim() && !isPending ? colors.primary : colors.muted }, input.trim() && !isPending ? shadow.sm : null]}
          onPress={() => send(input)}
          disabled={!input.trim() || isPending}
        >
          <Feather name="send" size={18} color={input.trim() && !isPending ? colors.primaryForeground : colors.mutedForeground} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md, gap: spacing.sm },
  headerActions: { flexDirection: "row", gap: spacing.sm },
  headerBtn: { width: 38, height: 38, borderRadius: radius.md, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.md },
  row: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, maxWidth: "100%" },
  rowUser: { justifyContent: "flex-end" },
  rowCoach: { justifyContent: "flex-start" },
  avatar: { width: 28, height: 28, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  bubble: { maxWidth: "82%", borderRadius: radius.xl - 2, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  bubbleText: { lineHeight: 21 },
  suggestions: { marginTop: spacing.lg, gap: spacing.sm },
  suggestionsLabel: { marginLeft: spacing.xs, marginBottom: 2, letterSpacing: 0.5 },
  chip: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  chipText: { flex: 1, fontSize: 14 },
  errorRow: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md },
  retryBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.sm },
  inputBar: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, maxHeight: 120, minHeight: 44, borderWidth: 1, borderRadius: radius.xl - 2, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md, fontSize: 15 },
  sendBtn: { width: 44, height: 44, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
});
