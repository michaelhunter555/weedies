"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";

import { useAdminAuth } from "@/context/admin-auth-context";
import {
  closeAdminChat,
  fetchAdminChatMessages,
  fetchAdminChats,
  sendAdminChatMessage,
  type AdminChatRow,
} from "@/lib/admin-api";

const LIST_LIMIT = 20;

const fmtTime = (d: Date) =>
  d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

const initialsOf = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join("") || "?";

function ConversationRow({
  chat,
  selected,
  onSelect,
}: {
  chat: AdminChatRow;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const name = chat.viewerCounterpart.displayName;
  const when = chat.lastMessageTime ?? chat.updatedAt;
  const at = when ? new Date(when) : new Date();
  const unread = Number(chat.unreadCount ?? 0);

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={() => onSelect(chat._id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect(chat._id);
      }}
      sx={{
        px: 2,
        py: 1.5,
        cursor: "pointer",
        borderLeft: "3px solid transparent",
        bgcolor: selected ? "action.selected" : "transparent",
        borderLeftColor: selected ? "primary.main" : "transparent",
        "&:hover": { bgcolor: selected ? "action.selected" : "action.hover" },
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Badge badgeContent={unread > 0 ? unread : 0} color="primary" invisible={unread <= 0}>
          <Avatar sx={{ width: 40, height: 40 }}>
            {chat.viewerCounterpart.masked ? "?" : initialsOf(name)}
          </Avatar>
        </Badge>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" justifyContent="space-between" spacing={1}>
            <Typography variant="subtitle2" fontWeight={700} noWrap>
              {name}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
              {fmtTime(at)}
            </Typography>
          </Stack>
          {chat.listing?.appName ? (
            <Typography variant="caption" color="text.secondary" noWrap display="block">
              {chat.listing.appName}
            </Typography>
          ) : null}
          <Typography variant="body2" color="text.secondary" noWrap>
            {chat.lastMessage ?? "No messages yet"}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}

export function AdminMessagesPanel() {
  const { accessToken, hydrated } = useAdminAuth();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  const chatsQuery = useQuery({
    queryKey: ["admin-chats", LIST_LIMIT],
    queryFn: () => fetchAdminChats({ page: 1, limit: LIST_LIMIT }),
    enabled: hydrated && !!accessToken,
    refetchInterval: 30_000,
  });

  const chats = chatsQuery.data?.chats ?? [];

  React.useEffect(() => {
    if (selectedId) return;
    if (chats.length > 0) setSelectedId(chats[0]._id);
  }, [chats, selectedId]);

  const messagesQuery = useQuery({
    queryKey: ["admin-chat-messages", selectedId],
    queryFn: () => fetchAdminChatMessages(selectedId!),
    enabled: hydrated && !!accessToken && !!selectedId,
    refetchInterval: 15_000,
  });

  const messages = React.useMemo(() => {
    const rows = messagesQuery.data?.chatMessages ?? [];
    return [...rows].reverse();
  }, [messagesQuery.data?.chatMessages]);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [selectedId, messages.length, messagesQuery.isFetching]);

  React.useEffect(() => {
    if (!selectedId || !messagesQuery.data) return;
    void queryClient.invalidateQueries({ queryKey: ["admin-chats-unread"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-chats"] });
  }, [selectedId, messagesQuery.data, queryClient]);

  const sendMutation = useMutation({
    mutationFn: (text: string) => sendAdminChatMessage(selectedId!, text),
    onSuccess: async () => {
      setDraft("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-chat-messages", selectedId] }),
        queryClient.invalidateQueries({ queryKey: ["admin-chats"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-chats-unread"] }),
      ]);
    },
  });

  const closeMutation = useMutation({
    mutationFn: (chatId: string) => closeAdminChat(chatId),
    onSuccess: async () => {
      setSelectedId(null);
      setDraft("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-chats"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-chats-unread"] }),
      ]);
    },
  });

  const selectedChat = chats.find((c) => c._id === selectedId) ?? null;
  const otherLeft = Boolean(messagesQuery.data?.otherParticipantLeft);

  if (!hydrated) {
    return (
      <Box sx={{ py: 8, textAlign: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!accessToken) {
    return <Alert severity="info">Sign in from the sidebar to view buyer messages.</Alert>;
  }

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h5" fontWeight={800}>
          Messages
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Inbox for the platform owner account (<code>ADMIN_CREATE_EMAIL</code>).
          Buyers message sellers on the marketplace; replies here go out as the platform
          owner.
        </Typography>
      </Box>

      {chatsQuery.error ? (
        <Alert severity="error">
          {chatsQuery.error instanceof Error
            ? chatsQuery.error.message
            : "Could not load inbox"}
        </Alert>
      ) : null}

      <Paper
        variant="outlined"
        sx={{
          display: "flex",
          minHeight: 520,
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            width: { xs: "100%", md: 320 },
            borderRight: { md: 1 },
            borderColor: "divider",
            display: { xs: selectedId ? "none" : "flex", md: "flex" },
            flexDirection: "column",
          }}
        >
          <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="subtitle2" fontWeight={700}>
              Conversations
            </Typography>
          </Box>
          <Box sx={{ flex: 1, overflow: "auto" }}>
            {chatsQuery.isLoading ? (
              <Box sx={{ py: 4, textAlign: "center" }}>
                <CircularProgress size={28} />
              </Box>
            ) : chats.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                No conversations yet. When buyers message a platform listing, threads
                appear here.
              </Typography>
            ) : (
              chats.map((chat) => (
                <ConversationRow
                  key={chat._id}
                  chat={chat}
                  selected={chat._id === selectedId}
                  onSelect={setSelectedId}
                />
              ))
            )}
          </Box>
        </Box>

        <Box
          sx={{
            flex: 1,
            display: { xs: selectedId ? "flex" : "none", md: "flex" },
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          {!selectedId ? (
            <Box
              sx={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                p: 3,
              }}
            >
              <Typography color="text.secondary">Select a conversation</Typography>
            </Box>
          ) : (
            <>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle1" fontWeight={700} noWrap>
                    {selectedChat?.viewerCounterpart.displayName ?? "Conversation"}
                  </Typography>
                  {selectedChat?.listing?.appName ? (
                    <Typography variant="caption" color="text.secondary" noWrap display="block">
                      Re: {selectedChat.listing.appName}
                    </Typography>
                  ) : null}
                </Box>
                <IconButton
                  size="small"
                  aria-label="Remove from inbox"
                  disabled={closeMutation.isPending}
                  onClick={() => closeMutation.mutate(selectedId)}
                >
                  <DeleteOutlineRoundedIcon fontSize="small" />
                </IconButton>
              </Stack>

              <Box ref={scrollRef} sx={{ flex: 1, overflow: "auto", p: 2 }}>
                {messagesQuery.isLoading ? (
                  <Box sx={{ py: 4, textAlign: "center" }}>
                    <CircularProgress size={28} />
                  </Box>
                ) : (
                  <Stack spacing={1.5}>
                    {messages.map((m) => (
                      <Box
                        key={m._id}
                        sx={{
                          alignSelf: m.fromMe ? "flex-end" : "flex-start",
                          maxWidth: "85%",
                          px: 1.5,
                          py: 1,
                          borderRadius: 2,
                          bgcolor: m.fromMe ? "primary.main" : "action.hover",
                          color: m.fromMe ? "primary.contrastText" : "text.primary",
                        }}
                      >
                        {!m.fromMe && !m.isSystem ? (
                          <Typography variant="caption" sx={{ opacity: 0.8, display: "block" }}>
                            {m.senderLabel}
                          </Typography>
                        ) : null}
                        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                          {m.text}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ opacity: 0.75, display: "block", mt: 0.25 }}
                        >
                          {m.createdAt ? fmtTime(new Date(m.createdAt)) : ""}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Box>

              {otherLeft ? (
                <Alert severity="warning" sx={{ mx: 2, mb: 1 }}>
                  The buyer left this chat. New messages may not be seen until they reopen it.
                </Alert>
              ) : null}

              {sendMutation.isError ? (
                <Alert severity="error" sx={{ mx: 2, mb: 1 }}>
                  {sendMutation.error instanceof Error
                    ? sendMutation.error.message
                    : "Send failed"}
                </Alert>
              ) : null}

              <Stack
                direction="row"
                spacing={1}
                alignItems="flex-end"
                sx={{ p: 2, borderTop: 1, borderColor: "divider" }}
              >
                <InputBase
                  multiline
                  maxRows={4}
                  placeholder="Write a reply…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      const text = draft.trim();
                      if (!text || sendMutation.isPending) return;
                      sendMutation.mutate(text);
                    }
                  }}
                  sx={{
                    flex: 1,
                    px: 1.5,
                    py: 1,
                    borderRadius: 2,
                    bgcolor: "action.hover",
                  }}
                  fullWidth
                />
                <IconButton
                  color="primary"
                  disabled={!draft.trim() || sendMutation.isPending || otherLeft}
                  onClick={() => {
                    const text = draft.trim();
                    if (!text) return;
                    sendMutation.mutate(text);
                  }}
                >
                  <SendRoundedIcon />
                </IconButton>
              </Stack>
            </>
          )}
        </Box>
      </Paper>
    </Stack>
  );
}
