"use client";

import { useEffect, useRef, useState } from "react";

import SendRoundedIcon from "@mui/icons-material/SendRounded";
import SmartToyRoundedIcon from "@mui/icons-material/SmartToyRounded";
import {
  Box,
  CircularProgress,
  IconButton,
  InputBase,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import { APP_NAME } from "@/brand";
import { useLiveChat } from "@/context/live-chat-context";
import { BRAND_PALETTE, brandContainedButtonSx } from "@/theme/brand-palette";
import { LIVE_CHAT_ANCHOR } from "./LiveChatBubble";

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function LiveChatWindow() {
  const { isOpen, messages, sendMessage, isSending } = useLiveChat();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [isOpen, messages, isSending]);

  if (!isOpen) return null;

  const handleSend = () => {
    const text = draft;
    if (!text.trim()) return;
    setDraft("");
    void sendMessage(text);
  };

  return (
    <Box
      role="dialog"
      aria-label="Support chat"
      sx={{
        position: "fixed",
        right: LIVE_CHAT_ANCHOR.right,
        bottom: { xs: 72, sm: 80 },
        zIndex: 1290,
        width: 300,
        maxWidth: "calc(100vw - 24px)",
        height: 360,
        maxHeight: { xs: "min(360px, calc(100vh - 88px))", sm: "min(360px, calc(100vh - 96px))" },
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Paper
        elevation={6}
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          borderRadius: 2.5,
          overflow: "hidden",
          border: `1px solid ${BRAND_PALETTE.sage}`,
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={0.75}
          sx={{
            px: 1.25,
            py: 1,
            bgcolor: BRAND_PALETTE.charcoal,
            color: BRAND_PALETTE.onPrimary,
            flexShrink: 0,
          }}
        >
          <SmartToyRoundedIcon sx={{ fontSize: 18, color: BRAND_PALETTE.seafoam }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" fontWeight={800} lineHeight={1.2} display="block">
              {APP_NAME}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8, fontSize: "0.65rem" }}>
              Policy-based help · not saved
            </Typography>
          </Box>
        </Stack>

        <Box
          ref={scrollRef}
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            px: 1.25,
            py: 1.25,
            bgcolor: BRAND_PALETTE.mint,
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          {messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <Box
                key={msg.id}
                sx={{
                  alignSelf: isUser ? "flex-end" : "flex-start",
                  maxWidth: "92%",
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    px: 1,
                    py: 0.75,
                    borderRadius: 1.5,
                    bgcolor: isUser ? BRAND_PALETTE.charcoal : "#fff",
                    color: isUser ? BRAND_PALETTE.onPrimary : BRAND_PALETTE.charcoal,
                    border: isUser ? "none" : `1px solid ${BRAND_PALETTE.sage}`,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ lineHeight: 1.4, whiteSpace: "pre-wrap", fontSize: "0.75rem" }}
                  >
                    {msg.content}
                  </Typography>
                </Paper>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: "block",
                    mt: 0.25,
                    fontSize: "0.625rem",
                    textAlign: isUser ? "right" : "left",
                  }}
                >
                  {formatTime(msg.createdAt)}
                </Typography>
              </Box>
            );
          })}
          {isSending ? (
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ alignSelf: "flex-start" }}>
              <CircularProgress size={12} />
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
                …
              </Typography>
            </Stack>
          ) : null}
        </Box>

        <Stack
          direction="row"
          spacing={0.5}
          alignItems="flex-end"
          sx={{
            px: 1,
            py: 1,
            borderTop: `1px solid ${BRAND_PALETTE.borderSubtle}`,
            bgcolor: "#fff",
            flexShrink: 0,
          }}
        >
          <InputBase
            multiline
            maxRows={3}
            fullWidth
            placeholder="Ask…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={isSending}
            sx={{
              px: 1,
              py: 0.5,
              borderRadius: 1.5,
              bgcolor: BRAND_PALETTE.listFormField,
              fontSize: "0.75rem",
              flex: 1,
            }}
          />
          <IconButton
            size="small"
            aria-label="Send message"
            onClick={handleSend}
            disabled={!draft.trim() || isSending}
            sx={{
              ...brandContainedButtonSx,
              width: 32,
              height: 32,
              borderRadius: 1.5,
              "&.Mui-disabled": {
                bgcolor: BRAND_PALETTE.borderSubtle,
                color: "text.disabled",
              },
            }}
          >
            <SendRoundedIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Stack>
      </Paper>
    </Box>
  );
}
