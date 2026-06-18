import { Feather } from "@expo/vector-icons";
import React, { useCallback, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSendCoachMessage } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

type ChatRole = "user" | "assistant";
type ChatMessage = { role: ChatRole; content: string };

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
        <Text
          style={[
            styles.bubbleText,
            { color: isUser ? "#FFFFFF" : colors.foreground, fontFamily: "Inter_400Regular" },
          ]}
        >
          {message.content}
        </Text>
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
        <Text style={[styles.bubbleText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Thinking…
        </Text>
      </View>
    </View>
  );
}

export default function CoachScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useSendCoachMessage();
  const isPending = mutation.isPending;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const tabBarSpace = Platform.OS === "web" ? 84 : 49 + insets.bottom;

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const requestReply = useCallback(
    async (conversation: ChatMessage[]) => {
      setError(null);
      try {
        const res = await mutation.mutateAsync({ data: { messages: conversation } });
        setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
        scrollToEnd();
      } catch {
        setError("The coach couldn't respond. Please try again.");
      }
    },
    [mutation, scrollToEnd],
  );

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isPending) return;
      const next: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
      setMessages(next);
      setInput("");
      scrollToEnd();
      void requestReply(next);
    },
    [isPending, messages, requestReply, scrollToEnd],
  );

  const retry = useCallback(() => {
    if (isPending || messages.length === 0) return;
    void requestReply(messages);
  }, [isPending, messages, requestReply]);

  const showSuggestions = messages.length === 0;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? topPad : 0}
    >
      <View style={styles.header}>
        <Text style={[styles.pageTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Coach</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Your digital safety advisor
        </Text>
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
                <Text style={[styles.suggestionsLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                  Try asking
                </Text>
                {SUGGESTIONS.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => send(s)}
                    disabled={isPending}
                  >
                    <Feather name="message-circle" size={14} color={colors.primary} />
                    <Text style={[styles.chipText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>{s}</Text>
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
                <Text style={[styles.errorText, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>{error}</Text>
                <TouchableOpacity
                  style={[styles.retryBtn, { backgroundColor: colors.secondary }]}
                  onPress={retry}
                >
                  <Feather name="refresh-cw" size={14} color={colors.primary} />
                  <Text style={[styles.retryText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>Retry</Text>
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
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, fontFamily: "Inter_400Regular" }]}
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
          style={[styles.sendBtn, { backgroundColor: input.trim() && !isPending ? colors.primary : colors.muted }]}
          onPress={() => send(input)}
          disabled={!input.trim() || isPending}
        >
          <Feather name="send" size={18} color={input.trim() && !isPending ? "#FFFFFF" : colors.mutedForeground} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  pageTitle: { fontSize: 28 },
  subtitle: { fontSize: 13, marginTop: 2 },
  listContent: { paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  row: { flexDirection: "row", alignItems: "flex-end", gap: 8, maxWidth: "100%" },
  rowUser: { justifyContent: "flex-end" },
  rowCoach: { justifyContent: "flex-start" },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  bubble: { maxWidth: "82%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  suggestions: { marginTop: 16, gap: 8 },
  suggestionsLabel: { fontSize: 12, marginLeft: 4, marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.5 },
  chip: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  chipText: { fontSize: 14, flex: 1 },
  errorRow: { alignItems: "center", gap: 8, paddingVertical: 12 },
  errorText: { fontSize: 13, textAlign: "center" },
  retryBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  retryText: { fontSize: 13 },
  inputBar: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, maxHeight: 120, minHeight: 44, borderWidth: 1, borderRadius: 22, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontSize: 15 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
