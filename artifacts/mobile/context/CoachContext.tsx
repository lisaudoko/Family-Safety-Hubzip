import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useSendCoachMessage } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";

export type ChatRole = "user" | "assistant";
export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface CoachConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

interface CoachContextType {
  conversations: CoachConversation[];
  activeConversationId: string | null;
  activeMessages: ChatMessage[];
  isSending: boolean;
  sendError: string | null;
  sendMessage: (text: string) => Promise<void>;
  retry: () => Promise<void>;
  startNewConversation: () => void;
  loadConversation: (id: string) => void;
  deleteConversation: (id: string) => Promise<void>;
}

const HISTORY_KEY = "@dv_coach_history";

function storageKey(userId?: string) {
  return userId ? `${HISTORY_KEY}:${userId}` : HISTORY_KEY;
}

function titleFromFirstMessage(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  return trimmed.length > 48 ? `${trimmed.slice(0, 48)}…` : trimmed || "New conversation";
}

const CoachContext = createContext<CoachContextType | undefined>(undefined);

export function CoachProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState<CoachConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const mutation = useSendCoachMessage();
  const loadedForUser = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setConversations([]);
      setActiveConversationId(null);
      loadedForUser.current = null;
      return;
    }
    if (loadedForUser.current === user.id) return;
    loadedForUser.current = user.id;

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey(user.id));
        setConversations(raw ? (JSON.parse(raw) as CoachConversation[]) : []);
      } catch {
        setConversations([]);
      }
      setActiveConversationId(null);
    })();
  }, [isAuthenticated, user?.id]);

  const persist = useCallback(
    async (next: CoachConversation[]) => {
      if (!user?.id) return;
      setConversations(next);
      try {
        await AsyncStorage.setItem(storageKey(user.id), JSON.stringify(next));
      } catch {
        // best-effort
      }
    },
    [user?.id],
  );

  const activeMessages = activeConversationId
    ? (conversations.find((c) => c.id === activeConversationId)?.messages ?? [])
    : [];

  const requestReply = useCallback(
    async (conversationMessages: ChatMessage[]) => {
      setSendError(null);
      try {
        const res = await mutation.mutateAsync({ data: { messages: conversationMessages } });
        const now = new Date().toISOString();
        const withReply: ChatMessage[] = [...conversationMessages, { role: "assistant", content: res.reply }];

        setConversations((prev) => {
          let next: CoachConversation[];
          if (activeConversationId && prev.some((c) => c.id === activeConversationId)) {
            next = prev.map((c) =>
              c.id === activeConversationId ? { ...c, messages: withReply, updatedAt: now } : c,
            );
          } else {
            const id = `coach_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            const firstUserMessage = conversationMessages.find((m) => m.role === "user");
            next = [
              {
                id,
                title: titleFromFirstMessage(firstUserMessage?.content ?? ""),
                messages: withReply,
                createdAt: now,
                updatedAt: now,
              },
              ...prev,
            ];
            setActiveConversationId(id);
          }
          void persist(next);
          return next;
        });
      } catch {
        setSendError("The coach couldn't respond. Please try again.");
      }
    },
    [activeConversationId, mutation, persist],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || mutation.isPending) return;
      const next: ChatMessage[] = [...activeMessages, { role: "user", content: trimmed }];

      const now = new Date().toISOString();
      setConversations((prev) => {
        if (activeConversationId && prev.some((c) => c.id === activeConversationId)) {
          const updated = prev.map((c) =>
            c.id === activeConversationId ? { ...c, messages: next, updatedAt: now } : c,
          );
          void persist(updated);
          return updated;
        }
        const id = `coach_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const updated: CoachConversation[] = [
          { id, title: titleFromFirstMessage(trimmed), messages: next, createdAt: now, updatedAt: now },
          ...prev,
        ];
        setActiveConversationId(id);
        void persist(updated);
        return updated;
      });

      await requestReply(next);
    },
    [activeConversationId, activeMessages, mutation.isPending, persist, requestReply],
  );

  const retry = useCallback(async () => {
    if (mutation.isPending || activeMessages.length === 0) return;
    await requestReply(activeMessages);
  }, [activeMessages, mutation.isPending, requestReply]);

  const startNewConversation = useCallback(() => {
    setActiveConversationId(null);
    setSendError(null);
  }, []);

  const loadConversation = useCallback((id: string) => {
    setActiveConversationId(id);
    setSendError(null);
  }, []);

  const deleteConversation = useCallback(
    async (id: string) => {
      const next = conversations.filter((c) => c.id !== id);
      if (activeConversationId === id) setActiveConversationId(null);
      await persist(next);
    },
    [activeConversationId, conversations, persist],
  );

  return (
    <CoachContext.Provider
      value={{
        conversations,
        activeConversationId,
        activeMessages,
        isSending: mutation.isPending,
        sendError,
        sendMessage,
        retry,
        startNewConversation,
        loadConversation,
        deleteConversation,
      }}
    >
      {children}
    </CoachContext.Provider>
  );
}

export function useCoach(): CoachContextType {
  const ctx = useContext(CoachContext);
  if (!ctx) throw new Error("useCoach must be used within a CoachProvider");
  return ctx;
}
