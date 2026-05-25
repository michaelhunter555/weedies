"use client";

import { useCallback } from "react";

import {
  buildApiBase,
  readStoredRefreshToken,
  useAuth,
} from "@/context/auth-context";

type Methods = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiFetchOptions = Omit<RequestInit, "method" | "body" | "headers"> & {
  /** Extra headers merged on top of `Authorization` and (when applicable)
   *  `Content-Type: application/json`. */
  headers?: HeadersInit;
  /**
   * If true, swallow auth failures and return the parsed body anyway. Useful
   * for "is the user logged in?"-style probes where 401 isn't a real error.
   * Defaults to false (a 401 surfaced after refresh logs the user out).
   */
  suppressAuthError?: boolean;
};

export type ApiFetchResult<T> = {
  ok: boolean;
  status: number;
  data: T;
};

const ACCESS_KEY = "weedies.accessToken";

const readAccessToken = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ACCESS_KEY);
  } catch {
    return null;
  }
};

/**
 * Single-flight refresh.
 * If 10 fetches all 401 at once, only one of them actually hits
 * /user/refresh - the rest await the same promise and then retry.
 *
 * Lives at module scope on purpose: the dedup needs to span every
 * caller of `useApiFetch`, not just calls from a single component.
 */
let inFlightRefresh: Promise<boolean> | null = null;

function singleFlightRefresh(refresh: () => Promise<void>): Promise<boolean> {
  if (inFlightRefresh) return inFlightRefresh;
  inFlightRefresh = (async () => {
    try {
      await refresh();
      return true;
    } catch {
      return false;
    } finally {
      // Clear on next tick so concurrent awaiters resolve against the same
      // promise but a *new* expiry triggers a new refresh.
      setTimeout(() => {
        inFlightRefresh = null;
      }, 0);
    }
  })();
  return inFlightRefresh;
}

/**
 * `apiFetch(path, method?, body?, options?)` - the web counterpart of the
 * React Native `useApiFetch`. Adds bearer auth, transparently refreshes the
 * access token on `EXPIRED_TOKEN` / 401, retries the original request once,
 * and signs the user out if refresh ultimately fails.
 *
 * Returns `{ ok, status, data }` so callers don't need a second `res.ok`
 * check after pulling JSON.
 */
export const useApiFetch = () => {
  const { refreshSession, logout } = useAuth();

  const apiFetch = useCallback(
    async <T = unknown,>(
      path: string,
      method: Methods = "GET",
      body?: unknown,
      options: ApiFetchOptions = {},
    ): Promise<ApiFetchResult<T>> => {
      const base = buildApiBase();
      const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

      const buildHeaders = (token: string | null): HeadersInit => {
        // Only set JSON content-type for real JSON payloads. FormData needs
        // the browser to inject its own multipart boundary, and raw strings
        // may be form-urlencoded or text/plain - let the caller decide via
        // `options.headers`.
        const isFormData =
          typeof FormData !== "undefined" && body instanceof FormData;
        const isJsonBody =
          body !== undefined &&
          body !== null &&
          typeof body !== "string" &&
          !isFormData;
        const headers: Record<string, string> = {
          ...(options.headers as Record<string, string> | undefined),
          ...(isJsonBody ? { "content-type": "application/json" } : {}),
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        };
        return headers;
      };

      const send = async (token: string | null) =>
        fetch(url, {
          method,
          credentials: "include",
          ...options,
          headers: buildHeaders(token),
          body:
            body === undefined || body === null
              ? undefined
              : typeof body === "string" || body instanceof FormData
                ? (body as BodyInit)
                : JSON.stringify(body),
        });

      const parse = async <U,>(r: Response): Promise<U> => {
        const text = await r.text();
        if (!text) return {} as U;
        try {
          return JSON.parse(text) as U;
        } catch {
          return text as unknown as U;
        }
      };

      const initialToken = readAccessToken();
      const res = await send(initialToken);
      const data = await parse<T & { code?: string; message?: string }>(res);

      const looksExpired =
        res.status === 401 &&
        ((data as { code?: string })?.code === "EXPIRED_TOKEN" ||
          // fallback: server didn't tag the error but we *had* a token
          (initialToken !== null &&
            (data as { code?: string })?.code !== "INVALID_TOKEN" &&
            (data as { code?: string })?.code !== "MISSING_TOKEN"));

      if (!looksExpired) {
        return { ok: res.ok, status: res.status, data };
      }

      // Try refresh - single-flight across the whole app.
      const didRefresh = await singleFlightRefresh(refreshSession);
      if (!didRefresh) {
        if (!options.suppressAuthError) {
          await logout().catch(() => undefined);
        }
        return { ok: false, status: res.status, data };
      }

      // Retry original request once with the fresh token.
      const retryToken = readAccessToken();
      const retry = await send(retryToken);
      const retryData = await parse<T & { code?: string; action?: string }>(
        retry,
      );

      if (!retry.ok && (retryData as { action?: string })?.action === "logout") {
        await logout().catch(() => undefined);
      }

      return { ok: retry.ok, status: retry.status, data: retryData };
    },
    [refreshSession, logout],
  );

  return { apiFetch };
};

/**
 * Convenience: throw on non-2xx so callers can use try/catch + return the
 * parsed body directly. Mirrors the ergonomic shape of the existing hooks
 * (`use-listings`, `use-stripe-wallet`).
 */
export const useApiFetchOrThrow = () => {
  const { apiFetch } = useApiFetch();

  const apiFetchOrThrow = useCallback(
    async <T = unknown,>(
      path: string,
      method: Methods = "GET",
      body?: unknown,
      options: ApiFetchOptions = {},
    ): Promise<T> => {
      const { ok, status, data } = await apiFetch<T>(
        path,
        method,
        body,
        options,
      );
      if (!ok) {
        const message =
          (data as { message?: string })?.message ||
          `Request failed (${status})`;
        const code = (data as { code?: string })?.code;
        const err = new Error(message) as Error & {
          status?: number;
          code?: string;
          payload?: unknown;
        };
        err.status = status;
        if (code) err.code = code;
        err.payload = data;
        throw err;
      }
      return data;
    },
    [apiFetch],
  );

  return { apiFetch: apiFetchOrThrow };
};
