"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { postSupportChatMessage } from "@/lib/support-chat-api";

export type LiveChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

const WELCOME_MESSAGE: LiveChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I'm the Dap & Flip support assistant. Ask about listing apps, fees, checkout, the exchange room, or our policies. This chat is not saved — close the window and it clears.",
  createdAt: Date.now(),
};

type LiveChatContextValue = {
  isOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  messages: LiveChatMessage[];
  sendMessage: (text: string) => Promise<void>;
  isSending: boolean;
};

const LiveChatContext = createContext<LiveChatContextValue | null>(null);

function nextId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function toApiHistory(messages: LiveChatMessage[]) {
  return messages
    .filter((m) => m.id !== "welcome")
    .map((m) => ({
      role: m.role,
      content: m.content,
    }));
}

export function LiveChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<LiveChatMessage[]>([WELCOME_MESSAGE]);
  const [isSending, setIsSending] = useState(false);

  const openChat = useCallback(() => setIsOpen(true), []);
  const closeChat = useCallback(() => setIsOpen(false), []);
  const toggleChat = useCallback(() => setIsOpen((v) => !v), []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isSending) return;

      const userMessage: LiveChatMessage = {
        id: nextId(),
        role: "user",
        content: trimmed,
        createdAt: Date.now(),
      };

      let historySnapshot: ReturnType<typeof toApiHistory> = [];
      setMessages((prev) => {
        historySnapshot = toApiHistory(prev);
        return [...prev, userMessage];
      });

      setIsSending(true);
      try {
        const reply = await postSupportChatMessage(trimmed, historySnapshot);
        const assistantMessage: LiveChatMessage = {
          id: nextId(),
          role: "assistant",
          content: reply,
          createdAt: Date.now(),
        };
        setMessages((current) => [...current, assistantMessage]);
      } catch (err) {
        const assistantMessage: LiveChatMessage = {
          id: nextId(),
          role: "assistant",
          content:
            err instanceof Error
              ? err.message
              : "Something went wrong. Try again or visit our contact page.",
          createdAt: Date.now(),
        };
        setMessages((current) => [...current, assistantMessage]);
      } finally {
        setIsSending(false);
      }
    },
    [isSending],
  );

  const value = useMemo(
    () => ({
      isOpen,
      openChat,
      closeChat,
      toggleChat,
      messages,
      sendMessage,
      isSending,
    }),
    [isOpen, openChat, closeChat, toggleChat, messages, sendMessage, isSending],
  );

  return (
    <LiveChatContext.Provider value={value}>{children}</LiveChatContext.Provider>
  );
}

export function useLiveChat() {
  const ctx = useContext(LiveChatContext);
  if (!ctx) {
    throw new Error("useLiveChat must be used within LiveChatProvider");
  }
  return ctx;
}
