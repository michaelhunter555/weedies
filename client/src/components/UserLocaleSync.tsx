"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/context/auth-context";
import { useApiFetchOrThrow } from "@/hooks/use-api-fetch";
import { readBrowserLocalePreferences } from "@/utils/user-locale";

/**
 * Keeps the signed-in user's timezone/locale in sync with the browser.
 */
export default function UserLocaleSync() {
  const { user, hydrated, update } = useAuth();
  const { apiFetch } = useApiFetchOrThrow();
  const lastSyncKey = useRef<string | null>(null);

  useEffect(() => {
    if (!hydrated || !user?.id) return;
    const prefs = readBrowserLocalePreferences();
    if (!prefs) return;

    const alreadyCurrent =
      user.timezone === prefs.timezone && user.locale === prefs.locale;
    if (alreadyCurrent) {
      lastSyncKey.current = `${user.id}:${prefs.timezone}:${prefs.locale}`;
      return;
    }

    const syncKey = `${user.id}:${prefs.timezone}:${prefs.locale}`;
    if (lastSyncKey.current === syncKey) return;
    lastSyncKey.current = syncKey;

    void (async () => {
      try {
        const data = await apiFetch<{ user?: Record<string, unknown> }>(
          "/user/me/preferences",
          "PATCH",
          prefs,
        );
        if (data?.user) {
          update({
            ...user,
            timezone: (data.user.timezone as string | null) ?? prefs.timezone,
            locale: (data.user.locale as string | null) ?? prefs.locale,
          });
        }
      } catch {
        lastSyncKey.current = null;
      }
    })();
  }, [
    hydrated,
    user?.id,
    user?.timezone,
    user?.locale,
    apiFetch,
    update,
    user,
  ]);

  return null;
}
