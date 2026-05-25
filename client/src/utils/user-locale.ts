export type BrowserLocalePreferences = {
  timezone: string;
  locale: string;
};

export function readBrowserLocalePreferences(): BrowserLocalePreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone?.trim();
    const locale =
      navigator.language?.trim() ||
      navigator.languages?.[0]?.trim() ||
      "en-US";
    if (!timezone) return null;
    return { timezone, locale };
  } catch {
    return null;
  }
}

export function formatUserRegionLabel(
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

export function firstNameFromDisplayName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "user";
  return trimmed.split(/\s+/)[0] ?? "user";
}
