"use client";

/**
 * Tiny toast helper.
 *
 * This is intentionally framework-light: we dispatch a `CustomEvent` on
 * `window` and let <Toaster /> (mounted in the root layout) render the
 * actual MUI Snackbar. That means non-React code (socket handlers, async
 * helpers) can fire toasts without needing a hook context.
 */

export type ToastSeverity = "success" | "info" | "warning" | "error";

export type ToastPayload = {
  severity?: ToastSeverity;
  title: string;
  description?: string;
  /** auto-hide duration in ms (default 4000) */
  duration?: number;
};

const EVENT = "app:toast";

export function pushToast(payload: ToastPayload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: payload }));
}

export const TOAST_EVENT = EVENT;

/**
 * Convenience hook for components that prefer the hook style.
 */
export function useToast() {
  return { pushToast };
}
