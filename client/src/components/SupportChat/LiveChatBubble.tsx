"use client";

import ChatRoundedIcon from "@mui/icons-material/ChatRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { Fab, Tooltip } from "@mui/material";

import { useLiveChat } from "@/context/live-chat-context";
import { BRAND_PALETTE } from "@/theme/brand-palette";

const ANCHOR = { right: { xs: 12, sm: 20 }, bottom: { xs: 12, sm: 20 } } as const;

export const LIVE_CHAT_ANCHOR = ANCHOR;

/** Small floating control — bottom-right corner. */
export function LiveChatBubble() {
  const { isOpen, openChat, closeChat } = useLiveChat();

  return (
    <Tooltip
      title={isOpen ? "Close chat" : "Got a question? Let's chat!"}
      placement="left"
      enterDelay={400}
    >
      <Fab
        size="medium"
        aria-label={isOpen ? "Close support chat" : "Open support chat"}
        onClick={isOpen ? closeChat : openChat}
        sx={{
          position: "fixed",
          ...ANCHOR,
          zIndex: 1300,
          width: 48,
          height: 48,
          minHeight: 48,
          boxShadow: "0 2px 12px rgba(37, 52, 58, 0.18)",
          bgcolor: BRAND_PALETTE.charcoal,
          color: BRAND_PALETTE.onPrimary,
          "&:hover": {
            bgcolor: BRAND_PALETTE.charcoalHover,
          },
        }}
      >
        {isOpen ? (
          <CloseRoundedIcon sx={{ fontSize: 22 }} />
        ) : (
          <ChatRoundedIcon sx={{ fontSize: 22 }} />
        )}
      </Fab>
    </Tooltip>
  );
}
