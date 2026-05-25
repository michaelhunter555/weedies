import type { HydratedDocument } from "mongoose";
import type { User } from "../models/user";

const MAX_TIMEZONE_LEN = 80;
const MAX_LOCALE_LEN = 35;

/** IANA timezone, e.g. `America/New_York`. */
export function normalizeTimezone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim();
  if (!v || v.length > MAX_TIMEZONE_LEN) return null;
  if (!/^[A-Za-z0-9_+\/-]+$/.test(v)) return null;
  return v;
}

/** BCP 47 locale, e.g. `en-US`. */
export function normalizeLocale(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim();
  if (!v || v.length > MAX_LOCALE_LEN) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(v)) return null;
  return v;
}

export function applyUserLocaleFields(
  user: HydratedDocument<User>,
  body: { timezone?: unknown; locale?: unknown },
): boolean {
  let changed = false;
  const tz = normalizeTimezone(body.timezone);
  const loc = normalizeLocale(body.locale);
  if (tz && user.timezone !== tz) {
    user.timezone = tz;
    changed = true;
  }
  if (loc && user.locale !== loc) {
    user.locale = loc;
    changed = true;
  }
  return changed;
}

export function regionLabelFromUser(
  locale?: string | null,
  timezone?: string | null,
): string {
  if (locale) {
    try {
      const loc = new Intl.Locale(locale);
      if (loc.region) {
        return (
          new Intl.DisplayNames(undefined, { type: "region" }).of(loc.region) ??
          loc.region
        );
      }
      return locale;
    } catch {
      return locale;
    }
  }
  if (timezone) {
    const parts = timezone.split("/");
    const last = parts[parts.length - 1];
    return last ? last.replace(/_/g, " ") : timezone;
  }
  return "—";
}
