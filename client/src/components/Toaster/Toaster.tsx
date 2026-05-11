"use client";

import { useEffect, useState } from "react";
import { Alert, AlertTitle, Snackbar } from "@mui/material";

import { TOAST_EVENT, type ToastPayload } from "@/hooks/use-toast";

type ActiveToast = ToastPayload & { id: number };

/**
 * Root-mounted listener that turns `pushToast(...)` calls into an MUI
 * Snackbar. Only renders one toast at a time; if a new toast arrives
 * while the old one is visible, the old one is replaced.
 */
export default function Toaster() {
  const [toast, setToast] = useState<ActiveToast | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ToastPayload>).detail;
      if (!detail?.title) return;
      setToast({ ...detail, id: Date.now() });
    };
    window.addEventListener(TOAST_EVENT, handler);
    return () => window.removeEventListener(TOAST_EVENT, handler);
  }, []);

  const handleClose = (_?: unknown, reason?: string) => {
    if (reason === "clickaway") return;
    setToast(null);
  };

  return (
    <Snackbar
      key={toast?.id}
      open={Boolean(toast)}
      autoHideDuration={toast?.duration ?? 4000}
      onClose={handleClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
    >
      {toast ? (
        <Alert
          onClose={handleClose}
          severity={toast.severity ?? "info"}
          variant="filled"
          sx={{ borderRadius: 2, minWidth: 280 }}
        >
          <AlertTitle sx={{ mb: toast.description ? 0.25 : 0 }}>
            {toast.title}
          </AlertTitle>
          {toast.description}
        </Alert>
      ) : (
        <span />
      )}
    </Snackbar>
  );
}
