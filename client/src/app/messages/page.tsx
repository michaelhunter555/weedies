"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Container,
  IconButton,
  InputBase,
  Pagination,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";

import { useAuth } from "@/context/auth-context";

// ─────────────────────────────────────────────────────────────────────────────
// Mock data. Once you have a messages API, replace the two arrays below with
// fetched state (React Query) and hand the real ids to the message list.
// Socket events can append to `messagesByConversation` keyed on the active id.
// ─────────────────────────────────────────────────────────────────────────────
const MAX_ACTIVE_CHATS = 10;
const PAGE_SIZE = 5;

type Conversation = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  lastMessagePreview: string;
  lastMessageAt: Date;
  unreadCount?: number;
};

type ChatMessage = {
  id: string;
  conversationId: string;
  body: string;
  at: Date;
  /** true if the message was sent by the currently logged-in user */
  fromMe: boolean;
};

const SAMPLE_CONVERSATIONS: Conversation[] = [
  {
    id: "c1",
    name: "Ajarn William",
    lastMessagePreview: "you there!",
    lastMessageAt: new Date("2026-02-27T22:26:00"),
    unreadCount: 1,
  },
  {
    id: "c2",
    name: "Mustafa Al",
    lastMessagePreview: "yo",
    lastMessageAt: new Date("2026-02-27T15:10:00"),
  },
  {
    id: "c3",
    name: "mihakl kal",
    lastMessagePreview: "yo",
    lastMessageAt: new Date("2026-02-24T13:45:00"),
  },
  {
    id: "c4",
    name: "Erica Thomas",
    lastMessagePreview: "yo",
    lastMessageAt: new Date("2026-02-24T09:12:00"),
  },
  {
    id: "c5",
    name: "Michael Hunter",
    lastMessagePreview: "hello",
    lastMessageAt: new Date("2026-02-24T08:40:00"),
  },
  {
    id: "c6",
    name: "Dana Brooks",
    lastMessagePreview: "sounds good, ship it!",
    lastMessageAt: new Date("2026-02-22T18:10:00"),
  },
];

const SAMPLE_MESSAGES: Record<string, ChatMessage[]> = {
  c1: [
    {
      id: "m1",
      conversationId: "c1",
      body: "hey",
      at: new Date("2026-02-26T22:02:00"),
      fromMe: false,
    },
    {
      id: "m2",
      conversationId: "c1",
      body: "hey bud",
      at: new Date("2026-02-26T22:02:30"),
      fromMe: false,
    },
    {
      id: "m3",
      conversationId: "c1",
      body: "still a cool feature",
      at: new Date("2026-02-27T18:24:00"),
      fromMe: false,
    },
    {
      id: "m4",
      conversationId: "c1",
      body: "test",
      at: new Date("2026-02-27T18:25:00"),
      fromMe: false,
    },
    {
      id: "m5",
      conversationId: "c1",
      body: "hey",
      at: new Date("2026-02-27T18:25:45"),
      fromMe: true,
    },
    {
      id: "m6",
      conversationId: "c1",
      body: "you there!",
      at: new Date("2026-02-27T18:26:00"),
      fromMe: false,
    },
  ],
  c2: [
    {
      id: "m7",
      conversationId: "c2",
      body: "yo",
      at: new Date("2026-02-27T15:10:00"),
      fromMe: false,
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

const fmtConversationDate = (d: Date) =>
  d.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const fmtDayDivider = (d: Date) =>
  d.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const fmtTime = (d: Date) =>
  d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

const initialsOf = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join("") || "?";

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components (kept in-file for now; split out if this grows)
// ─────────────────────────────────────────────────────────────────────────────

function ConversationRow({
  conversation,
  selected,
  onSelect,
}: {
  conversation: Conversation;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={() => onSelect(conversation.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect(conversation.id);
      }}
      sx={{
        px: 2,
        py: 1.75,
        cursor: "pointer",
        borderLeft: "3px solid transparent",
        transition: "background 120ms ease",
        background: selected
          ? "linear-gradient(135deg, #faf5ff 0%, #fdf2f8 100%)"
          : "transparent",
        borderLeftColor: selected ? "#7c3aed" : "transparent",
        "&:hover": {
          background: selected
            ? "linear-gradient(135deg, #faf5ff 0%, #fdf2f8 100%)"
            : "#fafafa",
        },
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Avatar
          src={conversation.avatarUrl || undefined}
          sx={{
            width: 42,
            height: 42,
            fontWeight: 700,
            background: conversation.avatarUrl
              ? undefined
              : "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)",
            color: "#fff",
          }}
        >
          {initialsOf(conversation.name)}
        </Avatar>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack
            direction="row"
            alignItems="baseline"
            justifyContent="space-between"
            spacing={1}
          >
            <Typography
              variant="body2"
              sx={{
                fontWeight: 700,
                lineHeight: 1.2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {conversation.name}
            </Typography>
            {conversation.unreadCount ? (
              <Box
                sx={{
                  minWidth: 18,
                  height: 18,
                  px: 0.75,
                  borderRadius: 999,
                  background:
                    "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 800,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {conversation.unreadCount}
              </Box>
            ) : null}
          </Stack>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 0.25 }}
          >
            {fmtConversationDate(conversation.lastMessageAt)}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 0.5,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {conversation.lastMessagePreview}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}

function MessageBubble({ m }: { m: ChatMessage }) {
  if (m.fromMe) {
    return (
      <Stack direction="row" justifyContent="flex-end">
        <Box
          sx={{
            maxWidth: "80%",
            px: 1.75,
            py: 1.25,
            borderRadius: "18px 18px 4px 18px",
            color: "#fff",
            background:
              "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)",
            boxShadow: "0 6px 18px rgba(124,58,237,0.25)",
          }}
        >
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, lineHeight: 1.25 }}
          >
            {m.body}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: "rgba(255,255,255,0.85)", mt: 0.25, display: "block" }}
          >
            {fmtTime(m.at)}
          </Typography>
        </Box>
      </Stack>
    );
  }

  return (
    <Stack direction="row" justifyContent="flex-start">
      <Box
        sx={{
          maxWidth: "80%",
          px: 1.75,
          py: 1.25,
          borderRadius: "18px 18px 18px 4px",
          bgcolor: "#f3f4f6",
          color: "text.primary",
        }}
      >
        <Typography variant="body2" sx={{ lineHeight: 1.25 }}>
          {m.body}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 0.25, display: "block" }}
        >
          {fmtTime(m.at)}
        </Typography>
      </Box>
    </Stack>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const { user, hydrated } = useAuth();

  // Mock state — swap these for React Query + socket data later.
  const [conversations, setConversations] = useState<Conversation[]>(
    SAMPLE_CONVERSATIONS,
  );
  const [messagesByConversation, setMessagesByConversation] = useState<
    Record<string, ChatMessage[]>
  >(SAMPLE_MESSAGES);

  const [selectedId, setSelectedId] = useState<string | null>(
    SAMPLE_CONVERSATIONS[0]?.id ?? null,
  );
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState("");

  const pageCount = Math.max(1, Math.ceil(conversations.length / PAGE_SIZE));
  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return conversations.slice(start, start + PAGE_SIZE);
  }, [conversations, page]);

  const selectedConversation =
    conversations.find((c) => c.id === selectedId) ?? null;
  const selectedMessages = selectedId
    ? messagesByConversation[selectedId] ?? []
    : [];

  // Auto-scroll to newest message when the active conversation changes or
  // a new message arrives.
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [selectedId, selectedMessages.length]);

  const handleCloseChat = () => setSelectedId(null);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !selectedId) return;

    // TODO(api): POST /api/messages { conversationId, body }
    //            then update local state on the socket `message` event.
    const msg: ChatMessage = {
      id: `local-${Date.now()}`,
      conversationId: selectedId,
      body,
      at: new Date(),
      fromMe: true,
    };
    setMessagesByConversation((prev) => ({
      ...prev,
      [selectedId]: [...(prev[selectedId] ?? []), msg],
    }));
    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedId
          ? { ...c, lastMessagePreview: body, lastMessageAt: msg.at, unreadCount: 0 }
          : c,
      ),
    );
    setDraft("");
  };

  // ── Auth guard (same pattern as the dashboard) ─────────────────────────────
  if (!hydrated) {
    return (
      <Container maxWidth="lg" sx={{ py: 10, textAlign: "center" }}>
        <CircularProgress />
      </Container>
    );
  }
  if (!user) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Alert
          severity="warning"
          action={
            <Button component={Link} href="/signup" size="small" color="inherit">
              Sign in
            </Button>
          }
        >
          Please log in to see your messages.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={2} sx={{ mb: 2 }}>
        <Stack
          direction="row"
          alignItems="baseline"
          justifyContent="space-between"
          flexWrap="wrap"
          spacing={1}
        >
          <Typography variant="h5" sx={{ fontWeight: 900 }}>
            Messages
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You can have up to <b>{MAX_ACTIVE_CHATS}</b> active chats at a time.
          </Typography>
        </Stack>
      </Stack>

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        alignItems="stretch"
        sx={{ minHeight: { md: 620 } }}
      >
        {/* ── Left: conversations list ────────────────────────────────────── */}
        <Paper
          variant="outlined"
          sx={{
            width: { xs: "100%", md: 340 },
            flexShrink: 0,
            borderRadius: 4,
            borderColor: "#ececec",
            overflow: "hidden",
            display: {
              xs: selectedId ? "none" : "flex",
              md: "flex",
            },
            flexDirection: "column",
          }}
        >
          <Box sx={{ px: 2.5, py: 2, borderBottom: "1px solid #ececec" }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Conversations
            </Typography>
          </Box>

          <Stack
            divider={<Box sx={{ borderBottom: "1px solid #f1f1f1" }} />}
            sx={{ flex: 1, overflowY: "auto" }}
          >
            {paged.length === 0 ? (
              <Box sx={{ p: 3, textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">
                  No conversations yet.
                </Typography>
              </Box>
            ) : (
              paged.map((c) => (
                <ConversationRow
                  key={c.id}
                  conversation={c}
                  selected={c.id === selectedId}
                  onSelect={(id) => {
                    setSelectedId(id);
                    setConversations((prev) =>
                      prev.map((x) =>
                        x.id === id ? { ...x, unreadCount: 0 } : x,
                      ),
                    );
                  }}
                />
              ))
            )}
          </Stack>

          {pageCount > 1 && (
            <Box
              sx={{
                px: 2,
                py: 1.5,
                borderTop: "1px solid #ececec",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Pagination
                count={pageCount}
                page={page}
                onChange={(_e, p) => setPage(p)}
                size="small"
                color="primary"
                shape="rounded"
              />
            </Box>
          )}
        </Paper>

        {/* ── Right: active conversation ──────────────────────────────────── */}
        <Paper
          variant="outlined"
          sx={{
            flex: 1,
            borderRadius: 4,
            borderColor: "#ececec",
            overflow: "hidden",
            display: {
              xs: selectedId ? "flex" : "none",
              md: "flex",
            },
            flexDirection: "column",
            minHeight: { xs: 520, md: "auto" },
          }}
        >
          {selectedConversation ? (
            <>
              {/* Header */}
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{
                  px: 2.5,
                  py: 1.75,
                  borderBottom: "1px solid #ececec",
                  bgcolor: "#fff",
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar
                    src={selectedConversation.avatarUrl || undefined}
                    sx={{
                      width: 36,
                      height: 36,
                      background: selectedConversation.avatarUrl
                        ? undefined
                        : "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)",
                      color: "#fff",
                      fontWeight: 700,
                    }}
                  >
                    {initialsOf(selectedConversation.name)}
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    {selectedConversation.name}
                  </Typography>
                </Stack>

                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Tooltip title="View profile">
                    <IconButton
                      aria-label="View profile"
                      size="small"
                      sx={{ color: "text.secondary" }}
                    >
                      <PersonRoundedIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Close chat">
                    <IconButton
                      aria-label="Close chat"
                      size="small"
                      onClick={handleCloseChat}
                      sx={{ color: "#ef4444" }}
                    >
                      <CloseRoundedIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>

              {/* Messages */}
              <Box
                ref={messagesScrollRef}
                sx={{
                  flex: 1,
                  overflowY: "auto",
                  px: { xs: 2, md: 3 },
                  py: 2,
                  bgcolor: "#fff",
                }}
              >
                <Stack spacing={1.25}>
                  {selectedMessages.map((m, idx) => {
                    const prev = selectedMessages[idx - 1];
                    const showDivider = !prev || !sameDay(prev.at, m.at);
                    return (
                      <Box key={m.id}>
                        {showDivider && (
                          <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="center"
                            sx={{ my: 1.5 }}
                          >
                            <Box
                              sx={{
                                px: 1.5,
                                py: 0.5,
                                borderRadius: 999,
                                bgcolor: "#f3f4f6",
                                color: "text.secondary",
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              {fmtDayDivider(m.at)}
                            </Box>
                          </Stack>
                        )}
                        <MessageBubble m={m} />
                      </Box>
                    );
                  })}

                  {selectedMessages.length === 0 && (
                    <Box sx={{ textAlign: "center", py: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        Say hi — no messages yet.
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Box>

              {/* Composer */}
              <Box
                component="form"
                onSubmit={handleSend}
                sx={{
                  px: 2,
                  py: 1.5,
                  borderTop: "1px solid #ececec",
                  bgcolor: "#fff",
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <Paper
                    variant="outlined"
                    sx={{
                      flex: 1,
                      borderRadius: 999,
                      px: 2,
                      py: 0.5,
                      borderColor: "#e5e7eb",
                      "&:focus-within": {
                        borderColor: "#7c3aed",
                        boxShadow: "0 0 0 3px rgba(124,58,237,0.15)",
                      },
                    }}
                  >
                    <InputBase
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Type a message..."
                      fullWidth
                      inputProps={{ "aria-label": "Message" }}
                    />
                  </Paper>
                  <IconButton
                    type="submit"
                    disabled={!draft.trim()}
                    aria-label="Send message"
                    sx={{
                      width: 44,
                      height: 44,
                      color: "#fff",
                      background: draft.trim()
                        ? "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)"
                        : "#e5e7eb",
                      boxShadow: draft.trim()
                        ? "0 6px 16px rgba(124,58,237,0.35)"
                        : "none",
                      "&:hover": {
                        background: draft.trim()
                          ? "linear-gradient(135deg, #6d28d9 0%, #db2777 100%)"
                          : "#e5e7eb",
                      },
                      "&.Mui-disabled": {
                        color: "#fff",
                        background: "#e5e7eb",
                      },
                    }}
                  >
                    <SendRoundedIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Box>
            </>
          ) : (
            <Stack
              alignItems="center"
              justifyContent="center"
              sx={{ flex: 1, p: 4, bgcolor: "#fff" }}
              spacing={1}
            >
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Pick a conversation
              </Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Select a conversation from the list to start chatting.
              </Typography>
            </Stack>
          )}
        </Paper>
      </Stack>
    </Container>
  );
}
