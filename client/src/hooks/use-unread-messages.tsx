"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/context/auth-context";
import { useApiFetchOrThrow } from "@/hooks/use-api-fetch";
import { useSocket } from "@/context/socket-io/socket-provider";
import { Notifications } from "@/context/socket-io/events";

export type UnreadMessagesResponse = {
  ok?: boolean;
  unreadCount: number;
  unreadByChat: Record<string, number>;
};

const KEY = ["chats", "unread-count"] as const;

/**
 * Inbox unread count for the signed-in viewer. Refetches whenever a new
 * `chat:message` arrives so the header badge updates without a refresh, and
 * gets invalidated by `/messages` after the user opens a thread.
 */
export function useUnreadMessages() {
  const { user, hydrated } = useAuth();
  const { apiFetch } = useApiFetchOrThrow();
  const { socket } = useSocket();
  const qc = useQueryClient();

  const enabled = Boolean(hydrated && user?.id);

  const query = useQuery<UnreadMessagesResponse>({
    queryKey: KEY,
    queryFn: () => apiFetch<UnreadMessagesResponse>("/chats/unread-count", "GET"),
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!socket || !enabled) return;
    const refetch = () => {
      qc.invalidateQueries({ queryKey: KEY }).catch(() => null);
    };
    socket.on("chat:message", refetch);
    socket.on(Notifications.NEW_MESSAGE, refetch);
    return () => {
      socket.off("chat:message", refetch);
      socket.off(Notifications.NEW_MESSAGE, refetch);
    };
  }, [socket, enabled, qc]);

  return {
    unreadCount: query.data?.unreadCount ?? 0,
    unreadByChat: query.data?.unreadByChat ?? {},
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
