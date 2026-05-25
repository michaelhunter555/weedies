"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Snackbar,
  Typography,
} from "@mui/material";
import type { AlertColor } from "@mui/material/Alert";

export type ShowSnackbarOptions = {
  message: string;
  severity?: AlertColor;
  /** Shown above the message (e.g. category: “Messages”, “Auctions”). */
  title?: string;
  description?: string;
  image?: string;
  /** Next.js path, e.g. `/messages` — opened when the user taps the action button. */
  path?: string;
  actionLabel?: string;
  autoHideDuration?: number;
  /** Runs before navigation (if any). If you only need a callback, omit `path`. */
  onAction?: () => void;
};

type SnackbarContextValue = {
  showSnackbar: (opts: ShowSnackbarOptions) => void;
};

const SnackbarContext = createContext<SnackbarContextValue | null>(null);

export const SNACKBAR_EVENT = "app:snackbar";

/**
 * Fire a snackbar from anywhere (socket handlers, utilities) without React context.
 * The provider listens on `window` for {@link SNACKBAR_EVENT}.
 */
export function pushSnackbar(opts: ShowSnackbarOptions) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SNACKBAR_EVENT, { detail: opts }));
}

export function useSnackbar() {
  const ctx = useContext(SnackbarContext);
  if (!ctx) {
    throw new Error("useSnackbar must be used within SnackbarProvider");
  }
  return ctx;
}

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<ShowSnackbarOptions | null>(null);

  const showSnackbar = useCallback((opts: ShowSnackbarOptions) => {
    if (!opts?.message?.trim()) return;
    setPayload(opts);
    setOpen(true);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ShowSnackbarOptions>).detail;
      if (detail?.message) showSnackbar(detail);
    };
    window.addEventListener(SNACKBAR_EVENT, handler);
    return () => window.removeEventListener(SNACKBAR_EVENT, handler);
  }, [showSnackbar]);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const handleExited = useCallback(() => {
    setPayload(null);
  }, []);

  const handleAction = useCallback(() => {
    if (payload?.onAction) {
      payload.onAction();
    }
    if (payload?.path) {
      router.push(payload.path);
    }
    handleClose();
  }, [payload, router, handleClose]);

  const value = useMemo(() => ({ showSnackbar }), [showSnackbar]);

  const hasCta = Boolean(payload?.path || payload?.onAction);
  const actionLabel = payload?.actionLabel ?? (hasCta ? "View" : "Dismiss");

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      <Snackbar
        open={open && Boolean(payload)}
        autoHideDuration={payload?.autoHideDuration ?? 6000}
        onClose={(_, reason) => {
          if (reason === "clickaway") return;
          handleClose();
        }}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        TransitionProps={{ onExited: handleExited }}
      >
        {payload ? (
          <Alert
            onClose={handleClose}
            severity={payload.severity ?? "info"}
            variant="filled"
            icon={false}
            sx={{
              width: "100%",
              minWidth: { xs: 280, sm: 360 },
              maxWidth: 440,
              alignItems: "flex-start",
              gap: 1.5,
              borderRadius: 3,
              py: 1.25,
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            }}
            action={
              <Button
                size="small"
                color="inherit"
                sx={{ fontWeight: 800, whiteSpace: "nowrap", mt: 0.25 }}
                onClick={() => {
                  if (hasCta) {
                    handleAction();
                  } else {
                    handleClose();
                  }
                }}
              >
                {actionLabel}
              </Button>
            }
          >
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.25, pr: 0.5 }}>
              {payload.image ? (
                <Avatar
                  src={payload.image}
                  alt=""
                  sx={{ width: 40, height: 40, mt: 0.25, flexShrink: 0 }}
                />
              ) : null}
              <Box sx={{ minWidth: 0 }}>
                {payload.title ? (
                  <Typography
                    variant="caption"
                    sx={{ display: "block", opacity: 0.92, fontWeight: 800, letterSpacing: 0.02 }}
                  >
                    {payload.title}
                  </Typography>
                ) : null}
                <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.35, mt: 0.25 }}>
                  {payload.message}
                </Typography>
                {payload.description ? (
                  <Typography
                    variant="caption"
                    sx={{ display: "block", mt: 0.5, opacity: 0.9, lineHeight: 1.35 }}
                  >
                    {payload.description}
                  </Typography>
                ) : null}
              </Box>
            </Box>
          </Alert>
        ) : (
          <span />
        )}
      </Snackbar>
    </SnackbarContext.Provider>
  );
}
