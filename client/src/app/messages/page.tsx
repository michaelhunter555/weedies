"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  InputBase,
  Pagination,
  Paper,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/context/auth-context";
import { useApiFetchOrThrow } from "@/hooks/use-api-fetch";
import { useListings } from "@/hooks/use-listings";
import { BRAND_PALETTE } from "@/theme/brand-palette";

const LIST_LIMIT = 10;
const DEFAULT_MAX_ACTIVE_CHATS = 10;

type ViewerCounterpart = {
  id: string | null;
  displayName: string;
  image: string;
  masked: boolean;
};

type ChatListingSummary = {
  id: string;
  appName: string;
  slug?: string;
  productPath: string;
};

type ApiChatRow = {
  _id: string;
  lastMessage?: string;
  lastMessageTime?: string;
  updatedAt?: string;
  listingId?: string;
  listing?: ChatListingSummary | null;
  viewerCounterpart: ViewerCounterpart;
  /** Server-computed: messages addressed to the viewer that are still `read: false`. */
  unreadCount?: number;
};

type GetChatsResponse = {
  chats: ApiChatRow[];
  page: number;
  totalPages: number;
  totalChats: number;
  limit: number;
  activeChatCount?: number;
  maxActiveChats?: number;
  ok?: boolean;
};

type CloseChatResponse = {
  ok?: boolean;
  activeChatCount?: number;
  maxActiveChats?: number;
  message?: string;
};

type ApiMessageRow = {
  _id: string;
  text: string;
  read: boolean;
  createdAt?: string;
  fromMe: boolean;
  senderLabel: string;
  senderId: string;
  isSystem?: boolean;
};

type GetMessagesResponse = {
  chatPreview?: ApiChatRow;
  chatMessages: ApiMessageRow[];
  otherParticipantLeft?: boolean;
  ok?: boolean;
};

type Conversation = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  lastMessagePreview: string;
  lastMessageAt: Date;
  listing?: ChatListingSummary | null;
  unreadCount?: number;
};

type ChatMessage = {
  id: string;
  body: string;
  at: Date;
  fromMe: boolean;
  senderLabel: string;
  isSystem?: boolean;
};

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

function isMongoObjectId(s: string): boolean {
  return /^[a-f\d]{24}$/i.test(s.trim());
}

type ComposeIntent = {
  recipientId: string;
  listingId: string;
  listingName: string;
  /** Opened from success room — simpler compose UI, correct buyer/seller copy. */
  fromExchange?: boolean;
  counterpartyRole?: "buyer" | "seller";
};

function mapApiChatToConversation(c: ApiChatRow): Conversation {
  const t = c.lastMessageTime ?? c.updatedAt;
  return {
    id: c._id,
    name: c.viewerCounterpart.displayName,
    avatarUrl: c.viewerCounterpart.masked ? null : c.viewerCounterpart.image || null,
    lastMessagePreview: String(c.lastMessage ?? ""),
    lastMessageAt: t ? new Date(t) : new Date(),
    listing: c.listing ?? null,
    unreadCount: Number(c.unreadCount ?? 0),
  };
}

function mapApiMessages(rows: ApiMessageRow[]): ChatMessage[] {
  return rows.map((m) => ({
    id: m._id,
    body: m.text,
    at: m.createdAt ? new Date(m.createdAt) : new Date(),
    fromMe: m.fromMe,
    senderLabel: m.senderLabel,
    isSystem: Boolean(m.isSystem),
  }));
}

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
        backgroundColor: selected ? BRAND_PALETTE.mint : "transparent",
        borderLeftColor: selected ? BRAND_PALETTE.seafoam : "transparent",
        "&:hover": {
          backgroundColor: selected ? BRAND_PALETTE.mint : "#fafafa",
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
            bgcolor: conversation.avatarUrl
              ? undefined
              : BRAND_PALETTE.seafoam,
            color: BRAND_PALETTE.onPrimary,
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
            {conversation.unreadCount && conversation.unreadCount > 0 ? (
              <Box
                component="span"
                sx={{
                  minWidth: 20,
                  height: 20,
                  px: 0.75,
                  borderRadius: 999,
                  bgcolor: "error.main",
                  color: "error.contrastText",
                  fontSize: 11,
                  fontWeight: 800,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
              </Box>
            ) : null}
          </Stack>
          {conversation.listing ? (
            <Typography variant="caption" component="div" sx={{ mt: 0.25 }}>
              <Link
                href={conversation.listing.productPath}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                style={{ fontWeight: 700, color: "inherit" }}
              >
                {conversation.listing.appName}
              </Link>
            </Typography>
          ) : null}
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
  if (m.isSystem) {
    return (
      <Stack direction="row" justifyContent="center" sx={{ my: 0.5 }}>
        <Box
          sx={{
            px: 1.5,
            py: 0.75,
            borderRadius: 999,
            bgcolor: "#f3f4f6",
            color: "text.secondary",
            maxWidth: "90%",
            textAlign: "center",
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 600, lineHeight: 1.35 }}>
            {m.body}
          </Typography>
        </Box>
      </Stack>
    );
  }

  if (m.fromMe) {
    return (
      <Stack direction="row" justifyContent="flex-end">
        <Box
          sx={{
            maxWidth: "80%",
            px: 1.75,
            py: 1.25,
            borderRadius: "18px 18px 4px 18px",
            color: BRAND_PALETTE.onPrimary,
            backgroundColor: BRAND_PALETTE.charcoal,
            boxShadow: "none",
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
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mb: 0.25, fontWeight: 600 }}
        >
          {m.senderLabel}
        </Typography>
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

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <Container maxWidth="lg" sx={{ py: 10, textAlign: "center" }}>
          <CircularProgress />
        </Container>
      }
    >
      <MessagesPageContent />
    </Suspense>
  );
}

function MessagesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatFromUrl = searchParams.get("chat")?.trim() ?? "";
  const theme = useTheme();
  /** Side-by-side list + thread from md up; stacked navigation below (phones, iPad portrait). */
  const isSplitLayout = useMediaQuery(theme.breakpoints.up("md"));
  const { user, hydrated } = useAuth();
  const { apiFetch } = useApiFetchOrThrow();
  const { createChat } = useListings();
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** On narrow screens: list vs active thread (separate from selectedId for list highlight). */
  const [mobileShowList, setMobileShowList] = useState(true);
  const [listPage, setListPage] = useState(1);
  const [draft, setDraft] = useState("");
  const [composeIntent, setComposeIntent] = useState<ComposeIntent | null>(null);
  const [composeError, setComposeError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const chatsQuery = useQuery({
    queryKey: ["chats", "mine", listPage, LIST_LIMIT],
    queryFn: () =>
      apiFetch<GetChatsResponse>(
        `/chats/mine?page=${listPage}&limit=${LIST_LIMIT}`,
        "GET",
      ),
    enabled: Boolean(user && hydrated),
  });

  useEffect(() => {
    if (!hydrated || !user?.id) return;
    if (typeof window === "undefined") return;

    if (chatFromUrl && isMongoObjectId(chatFromUrl)) {
      setComposeIntent(null);
      setComposeError(null);
      setSelectedId(chatFromUrl);
      setMobileShowList(false);
      return;
    }

    const sp = new URLSearchParams(window.location.search);
    const listingId = sp.get("listingId")?.trim() ?? "";
    const sellerId = sp.get("sellerId")?.trim() ?? "";
    const recipientIdParam = sp.get("recipientId")?.trim() ?? "";
    const recipientId = recipientIdParam || sellerId;
    const fromExchange = sp.get("exchange") === "1";
    const counterpartyRaw = sp.get("counterparty")?.trim() ?? "";
    const counterpartyRole =
      counterpartyRaw === "buyer" || counterpartyRaw === "seller"
        ? counterpartyRaw
        : undefined;
    const listingName =
      sp.get("subject")?.trim() ||
      sp.get("listingName")?.trim() ||
      (listingId ? `Listing ${listingId.slice(0, 8)}…` : "");
    const prefill = sp.get("prefill")?.trim() ?? "";

    if (!listingId && !recipientId) {
      setComposeIntent(null);
      setComposeError(null);
      return;
    }

    if (listingId && !isMongoObjectId(listingId)) {
      setComposeError("Invalid listing id in link.");
      setComposeIntent(null);
      return;
    }

    if (!listingId && recipientId && !isMongoObjectId(recipientId)) {
      setComposeError("Invalid recipient id in link.");
      setComposeIntent(null);
      return;
    }

    if (recipientId && user.id === recipientId) {
      setComposeError("You cannot message yourself.");
      setComposeIntent(null);
      return;
    }

    if (listingId && isMongoObjectId(listingId)) {
      if (!recipientId || !isMongoObjectId(recipientId)) {
        setComposeError(
          fromExchange
            ? "This exchange message link is missing the recipient."
            : "This link is missing the seller id. Open “Message seller” from the listing page, or add sellerId=… to the URL.",
        );
        setComposeIntent(null);
        return;
      }
      if (user.id === recipientId) {
        setComposeError("You cannot message yourself.");
        setComposeIntent(null);
        return;
      }
      setComposeIntent({
        recipientId,
        listingId,
        listingName: listingName || "Listing",
        fromExchange,
        counterpartyRole: fromExchange ? counterpartyRole : undefined,
      });
      setMobileShowList(false);
      if (prefill) setDraft(prefill);
      return;
    }

    if (recipientId && isMongoObjectId(recipientId)) {
      setComposeIntent({
        recipientId,
        listingId: "",
        listingName: listingName || "Seller",
        fromExchange,
        counterpartyRole: fromExchange ? counterpartyRole : undefined,
      });
      setMobileShowList(false);
      if (prefill) setDraft(prefill);
    }
  }, [hydrated, user?.id, chatFromUrl]);

  const conversations = useMemo(
    () => (chatsQuery.data?.chats ?? []).map(mapApiChatToConversation),
    [chatsQuery.data?.chats],
  );

  useEffect(() => {
    if (!hydrated || !user?.id) return;
    if (!isSplitLayout) return;
    if (chatFromUrl && isMongoObjectId(chatFromUrl)) {
      return;
    }
    if (!chatsQuery.data?.chats?.length) return;
    if (composeIntent && !selectedId) return;
    setSelectedId((prev) => {
      if (prev && chatsQuery.data!.chats.some((c) => c._id === prev)) {
        return prev;
      }
      return chatsQuery.data!.chats[0]?._id ?? null;
    });
  }, [
    hydrated,
    user?.id,
    isSplitLayout,
    chatFromUrl,
    chatsQuery.data,
    chatsQuery.data?.chats,
    composeIntent,
    selectedId,
  ]);

  const messagesQuery = useQuery({
    queryKey: ["chat", selectedId, "messages"],
    queryFn: () =>
      apiFetch<GetMessagesResponse>(
        `/chats/${encodeURIComponent(selectedId!)}/messages?page=1&limit=100`,
        "GET",
      ),
    enabled: Boolean(user && hydrated && selectedId),
  });

  // Opening a chat marks its messages as read on the server. Sync the
  // header badge + dashboard tile right away (no need to wait for refetch).
  useEffect(() => {
    if (!selectedId) return;
    if (!messagesQuery.data) return;
    queryClient.invalidateQueries({ queryKey: ["chats", "unread-count"] }).catch(
      () => null,
    );
    queryClient.invalidateQueries({ queryKey: ["chats"] }).catch(() => null);
  }, [selectedId, messagesQuery.data, queryClient]);

  const selectedMessages = useMemo(() => {
    if (!selectedId || !messagesQuery.data?.chatMessages) return [];
    return mapApiMessages(messagesQuery.data.chatMessages);
  }, [selectedId, messagesQuery.data?.chatMessages]);

  const maxActiveChats =
    chatsQuery.data?.maxActiveChats ?? DEFAULT_MAX_ACTIVE_CHATS;
  const activeChatCount =
    chatsQuery.data?.activeChatCount ?? chatsQuery.data?.totalChats ?? 0;

  const closeChatMutation = useMutation({
    mutationFn: (chatId: string) =>
      apiFetch<CloseChatResponse>(
        `/chats/${encodeURIComponent(chatId)}`,
        "DELETE",
      ),
    onSuccess: async () => {
      setDeleteDialogOpen(false);
      setDeleteTargetId(null);
      setSelectedId(null);
      setMobileShowList(true);
      setDraft("");
      router.replace("/messages", { scroll: false });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["chats"] }),
        queryClient.invalidateQueries({ queryKey: ["chats", "unread-count"] }),
      ]);
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!selectedId) throw new Error("No chat selected.");
      return apiFetch<{ ok?: boolean }>(
        `/chats/${encodeURIComponent(selectedId)}/messages`,
        "POST",
        { text },
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["chat", selectedId, "messages"] }),
        queryClient.invalidateQueries({ queryKey: ["chats"] }),
      ]);
    },
  });

  const createChatMutation = useMutation({
    mutationFn: async (payload: { text: string; intent: ComposeIntent }) =>
      createChat({
        recipientId: payload.intent.recipientId,
        message: payload.text,
        listingId: payload.intent.listingId || undefined,
        chatType: payload.intent.fromExchange ? "postSale" : "general",
      }),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["chats"] });
      const raw = data?.chat as { _id?: unknown } | undefined;
      const chatId = raw?._id != null ? String(raw._id) : null;
      setComposeIntent(null);
      setComposeError(null);
      setDraft("");
      if (chatId) {
        setSelectedId(chatId);
        setMobileShowList(false);
        router.replace(`/messages?chat=${encodeURIComponent(chatId)}`, { scroll: false });
      } else {
        router.replace("/messages", { scroll: false });
      }
    },
  });

  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [selectedId, selectedMessages.length, messagesQuery.isFetching]);

  const showConversationList = isSplitLayout || mobileShowList;
  const showActiveThread =
    isSplitLayout || (!mobileShowList && Boolean(selectedId || composeIntent));

  const handleBackToList = () => {
    setMobileShowList(true);
    setComposeIntent(null);
    setComposeError(null);
    router.replace("/messages", { scroll: false });
  };

  const handleCloseCompose = () => {
    if (!isSplitLayout) {
      handleBackToList();
      return;
    }
    setComposeIntent(null);
    setComposeError(null);
    router.replace("/messages", { scroll: false });
  };

  const handleRequestRemoveChat = (chatId: string) => {
    setDeleteTargetId(chatId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmRemoveChat = () => {
    const id = deleteTargetId ?? selectedId;
    if (!id || closeChatMutation.isPending) return;
    closeChatMutation.mutate(id);
  };

  const handleSelectConversation = (id: string) => {
    setComposeIntent(null);
    setComposeError(null);
    setSelectedId(id);
    if (!isSplitLayout) setMobileShowList(false);
    router.replace(`/messages?chat=${encodeURIComponent(id)}`, { scroll: false });
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;

    if (composeIntent && !selectedId) {
      if (createChatMutation.isPending) return;
      createChatMutation.mutate(
        { text: body, intent: composeIntent },
        {
          onError: (err) => {
            setComposeError(err instanceof Error ? err.message : "Could not start chat.");
          },
        },
      );
      return;
    }

    if (!selectedId || sendMutation.isPending) return;
    sendMutation.mutate(body, {
      onSuccess: () => setDraft(""),
      onError: () => {
        /* surfaced below */
      },
    });
  };

  const selectedConversation = useMemo(() => {
    if (!selectedId) return null;
    const fromList = conversations.find((c) => c.id === selectedId) ?? null;
    if (fromList) return fromList;
    const preview = messagesQuery.data?.chatPreview;
    if (preview && preview._id === selectedId) {
      return mapApiChatToConversation(preview);
    }
    return null;
  }, [selectedId, conversations, messagesQuery.data?.chatPreview]);

  const totalListPages = Math.max(1, chatsQuery.data?.totalPages ?? 1);
  const otherParticipantLeft = Boolean(messagesQuery.data?.otherParticipantLeft);

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
          {chatsQuery.data?.totalChats != null ? (
            <Typography variant="body2" color="text.secondary">
              {activeChatCount} of {maxActiveChats} active
              {activeChatCount >= maxActiveChats ? " (limit reached)" : ""}
            </Typography>
          ) : null}
        </Stack>
      </Stack>

      {(chatsQuery.isError ||
        messagesQuery.isError ||
        sendMutation.isError ||
        createChatMutation.isError ||
        closeChatMutation.isError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(chatsQuery.error as Error)?.message ||
            (messagesQuery.error as Error)?.message ||
            (sendMutation.error as Error)?.message ||
            (createChatMutation.error as Error)?.message ||
            (closeChatMutation.error as Error)?.message ||
            "Something went wrong."}
        </Alert>
      )}

      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          if (closeChatMutation.isPending) return;
          setDeleteDialogOpen(false);
          setDeleteTargetId(null);
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Remove this chat?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This conversation will be removed from your inbox and will no longer
            count toward your limit of {maxActiveChats} active chats. The other
            person can still see the thread until they remove it too.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => {
              setDeleteDialogOpen(false);
              setDeleteTargetId(null);
            }}
            disabled={closeChatMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleConfirmRemoveChat}
            disabled={closeChatMutation.isPending}
          >
            {closeChatMutation.isPending ? "Removing…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {composeError ? (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setComposeError(null)}>
          {composeError}
        </Alert>
      ) : null}

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        alignItems="stretch"
        sx={{ minHeight: { md: 620 } }}
      >
        <Paper
          variant="outlined"
          sx={{
            width: { xs: "100%", md: 340 },
            flexShrink: 0,
            borderRadius: 4,
            borderColor: "#ececec",
            overflow: "hidden",
            display: showConversationList ? "flex" : "none",
            flexDirection: "column",
            minHeight: { xs: showConversationList ? 480 : 0, md: "auto" },
          }}
        >
          <Box sx={{ px: 2.5, py: 2, borderBottom: "1px solid #ececec" }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Conversations
            </Typography>
            {!isSplitLayout ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                Tap a conversation to open it.
              </Typography>
            ) : null}
          </Box>

          <Stack
            divider={<Box sx={{ borderBottom: "1px solid #f1f1f1" }} />}
            sx={{ flex: 1, overflowY: "auto", position: "relative" }}
          >
            {chatsQuery.isLoading ? (
              <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
                <CircularProgress size={28} />
              </Box>
            ) : conversations.length === 0 ? (
              <Box sx={{ p: 3, textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">
                  No conversations yet.
                </Typography>
              </Box>
            ) : (
              conversations.map((c) => (
                <ConversationRow
                  key={c.id}
                  conversation={c}
                  selected={c.id === selectedId}
                  onSelect={handleSelectConversation}
                />
              ))
            )}
          </Stack>

          {totalListPages > 1 && (
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
                count={totalListPages}
                page={listPage}
                onChange={(_e, p) => setListPage(p)}
                size="small"
                color="primary"
                shape="rounded"
              />
            </Box>
          )}
        </Paper>

        <Paper
          variant="outlined"
          sx={{
            flex: 1,
            borderRadius: 4,
            borderColor: "#ececec",
            overflow: "hidden",
            display: showActiveThread ? "flex" : "none",
            flexDirection: "column",
            minHeight: { xs: showActiveThread ? 520 : 0, md: "auto" },
          }}
        >
          {composeIntent && !selectedId ? (
            <>
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
                <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                  {!isSplitLayout ? (
                    <IconButton
                      aria-label="Back to conversations"
                      size="small"
                      onClick={handleBackToList}
                      sx={{ color: "text.primary", flexShrink: 0 }}
                    >
                      <ArrowBackRoundedIcon />
                    </IconButton>
                  ) : null}
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    {composeIntent.fromExchange
                      ? composeIntent.counterpartyRole === "buyer"
                        ? "Message buyer"
                        : composeIntent.counterpartyRole === "seller"
                          ? "Message seller"
                          : "Message"
                      : "Message seller"}
                  </Typography>
                </Stack>
                {isSplitLayout ? (
                  <Tooltip title="Cancel">
                    <IconButton
                      aria-label="Cancel new message"
                      size="small"
                      onClick={handleCloseCompose}
                      sx={{ color: "#ef4444" }}
                    >
                      <CloseRoundedIcon />
                    </IconButton>
                  </Tooltip>
                ) : null}
              </Stack>

              <Box sx={{ px: { xs: 2, md: 3 }, py: 2, bgcolor: "#fafafa", borderBottom: "1px solid #ececec" }}>
                {composeIntent.fromExchange ? (
                  <>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      {composeIntent.counterpartyRole === "buyer"
                        ? "Send a message to the buyer about this sale."
                        : composeIntent.counterpartyRole === "seller"
                          ? "Send a message to the seller about this sale."
                          : "Send a message about this sale."}
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
                      <Chip size="small" color="primary" variant="outlined" label={composeIntent.listingName} />
                      {composeIntent.counterpartyRole ? (
                        <Chip
                          size="small"
                          variant="outlined"
                          label={
                            composeIntent.counterpartyRole === "buyer" ? "Buyer" : "Seller"
                          }
                        />
                      ) : null}
                    </Stack>
                  </>
                ) : (
                  <>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      Your first message will go to the seller of this listing (we only show their
                      name in the thread after they reply, when the chat is tied to a listing).
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
                      {composeIntent.listingId ? (
                        <Chip
                          size="small"
                          variant="outlined"
                          label={`Listing ${composeIntent.listingId}`}
                          sx={{ fontFamily: "monospace", fontSize: 12 }}
                        />
                      ) : null}
                      <Chip size="small" color="primary" variant="outlined" label={composeIntent.listingName} />
                      <Chip size="small" label="Seller" />
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
                      Recipient user id:{" "}
                      <Box component="span" sx={{ fontFamily: "monospace" }}>
                        {composeIntent.recipientId}
                      </Box>
                    </Typography>
                  </>
                )}
              </Box>

              <Box
                sx={{
                  flex: 1,
                  overflowY: "auto",
                  px: { xs: 2, md: 3 },
                  py: 3,
                  bgcolor: "#fff",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {composeIntent.fromExchange
                    ? `Write your message below, then send. We will notify the ${
                        composeIntent.counterpartyRole === "buyer"
                          ? "buyer"
                          : composeIntent.counterpartyRole === "seller"
                            ? "seller"
                            : "other party"
                      } when they are online.`
                    : "Write your opening message below, then send. We will open the chat and notify the seller in real time when they are online."}
                </Typography>
              </Box>

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
                        borderColor: BRAND_PALETTE.seafoam,
                        boxShadow: `0 0 0 3px ${BRAND_PALETTE.mint}`,
                      },
                    }}
                  >
                    <InputBase
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Introduce yourself and your question…"
                      fullWidth
                      disabled={createChatMutation.isPending}
                      inputProps={{ "aria-label": "First message to seller" }}
                    />
                  </Paper>
                  <IconButton
                    type="submit"
                    disabled={
                      !draft.trim() || createChatMutation.isPending
                    }
                    aria-label="Send and start chat"
                    sx={{
                      width: 44,
                      height: 44,
                      color: BRAND_PALETTE.onPrimary,
                      backgroundColor: draft.trim()
                        ? BRAND_PALETTE.charcoal
                        : "#e5e7eb",
                      boxShadow: "none",
                      "&:hover": {
                        backgroundColor: draft.trim()
                          ? BRAND_PALETTE.charcoalHover
                          : "#e5e7eb",
                      },
                      "&.Mui-disabled": {
                        color: BRAND_PALETTE.onPrimary,
                        backgroundColor: "#e5e7eb",
                      },
                    }}
                  >
                    <SendRoundedIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Box>
            </>
          ) : selectedId ? (
            selectedConversation ? (
            <>
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
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  flexWrap="wrap"
                  useFlexGap
                  sx={{ minWidth: 0, flex: 1 }}
                >
                  {!isSplitLayout ? (
                    <IconButton
                      aria-label="Back to conversations"
                      size="small"
                      onClick={handleBackToList}
                      sx={{ color: "text.primary", flexShrink: 0 }}
                    >
                      <ArrowBackRoundedIcon />
                    </IconButton>
                  ) : null}
                  <Avatar
                    src={selectedConversation.avatarUrl || undefined}
                    sx={{
                      width: 36,
                      height: 36,
                      bgcolor: selectedConversation.avatarUrl
                        ? undefined
                        : BRAND_PALETTE.seafoam,
                      color: BRAND_PALETTE.onPrimary,
                      fontWeight: 700,
                    }}
                  >
                    {initialsOf(selectedConversation.name)}
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    {selectedConversation.name}
                  </Typography>
                  {selectedConversation.listing ? (
                    <Button
                      component={Link}
                      href={selectedConversation.listing.productPath}
                      size="small"
                      variant="outlined"
                      endIcon={<OpenInNewRoundedIcon sx={{ fontSize: 18 }} />}
                      sx={{ textTransform: "none", fontWeight: 700 }}
                    >
                      {selectedConversation.listing.appName}
                    </Button>
                  ) : null}
                </Stack>

                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                  {isSplitLayout ? (
                    <Tooltip title="View profile">
                      <IconButton
                        aria-label="View profile"
                        size="small"
                        sx={{ color: "text.secondary" }}
                      >
                        <PersonRoundedIcon />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                  <Tooltip title="Remove chat from inbox">
                    <IconButton
                      aria-label="Remove chat from inbox"
                      size="small"
                      onClick={() =>
                        selectedId && handleRequestRemoveChat(selectedId)
                      }
                      disabled={!selectedId || closeChatMutation.isPending}
                      sx={{ color: "#ef4444" }}
                    >
                      <CloseRoundedIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>

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
                {messagesQuery.isLoading ? (
                  <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
                    <CircularProgress size={28} />
                  </Box>
                ) : (
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
                )}
              </Box>

              {otherParticipantLeft ? (
                <Alert severity="warning" sx={{ mx: 2, mt: 1, borderRadius: 2 }}>
                  The other person left this chat. New messages will not reach them until
                  they open the conversation again.
                </Alert>
              ) : null}

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
                      opacity: otherParticipantLeft ? 0.65 : 1,
                      "&:focus-within": {
                        borderColor: BRAND_PALETTE.seafoam,
                        boxShadow: `0 0 0 3px ${BRAND_PALETTE.mint}`,
                      },
                    }}
                  >
                    <InputBase
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder={
                        otherParticipantLeft
                          ? "The other person left this chat"
                          : "Type a message..."
                      }
                      fullWidth
                      disabled={sendMutation.isPending || otherParticipantLeft}
                      inputProps={{ "aria-label": "Message" }}
                    />
                  </Paper>
                  <IconButton
                    type="submit"
                    disabled={
                      !draft.trim() ||
                      sendMutation.isPending ||
                      otherParticipantLeft
                    }
                    aria-label="Send message"
                    sx={{
                      width: 44,
                      height: 44,
                      color: BRAND_PALETTE.onPrimary,
                      backgroundColor: draft.trim()
                        ? BRAND_PALETTE.charcoal
                        : "#e5e7eb",
                      boxShadow: "none",
                      "&:hover": {
                        backgroundColor: draft.trim()
                          ? BRAND_PALETTE.charcoalHover
                          : "#e5e7eb",
                      },
                      "&.Mui-disabled": {
                        color: BRAND_PALETTE.onPrimary,
                        backgroundColor: "#e5e7eb",
                      },
                    }}
                  >
                    <SendRoundedIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Box>
            </>
          ) : messagesQuery.isError ? (
            <Stack
              alignItems="center"
              justifyContent="center"
              sx={{ flex: 1, p: 4, bgcolor: "#fff" }}
            >
              <Alert severity="error">
                {(messagesQuery.error as Error)?.message ?? "Could not load this chat."}
              </Alert>
            </Stack>
          ) : (
            <Stack
              alignItems="center"
              justifyContent="center"
              sx={{ flex: 1, p: 6, bgcolor: "#fff" }}
              spacing={2}
            >
              <CircularProgress size={32} />
              <Typography variant="body2" color="text.secondary">
                Loading conversation…
              </Typography>
            </Stack>
          )
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
