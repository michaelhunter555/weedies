import type { Platforms, SocialMediaPlatform } from "../../types";

/** Fixed store/profile origins — user enters only the path after these. */
export const PLATFORM_URL_PREFIXES: Partial<Record<Platforms, string>> = {
  ios: "https://apps.apple.com/",
  android: "https://play.google.com/",
  macOs: "https://apps.apple.com/",
  windows: "https://apps.microsoft.com/",
  chromeExtension: "https://chromewebstore.google.com/",
};

export const SOCIAL_URL_PREFIXES: Partial<Record<SocialMediaPlatform, string>> = {
  instagram: "https://www.instagram.com/",
  x: "https://www.x.com/",
  youtube: "https://www.youtube.com/",
  facebook: "https://www.facebook.com/",
  linkedin: "https://www.linkedin.com/",
};

/** Legacy listings may still store `twitter` before the X rename. */
export function normalizeSocialMediaPlatform(
  platform: string,
): SocialMediaPlatform {
  return (platform === "twitter" ? "x" : platform) as SocialMediaPlatform;
}

export function normalizeSocialMediaList(
  platforms?: string[] | null,
): SocialMediaPlatform[] {
  const out: SocialMediaPlatform[] = [];
  for (const platform of platforms ?? []) {
    const normalized = normalizeSocialMediaPlatform(platform);
    if (!out.includes(normalized)) out.push(normalized);
  }
  return out;
}

export function platformUrlPrefix(platform: Platforms): string | undefined {
  return PLATFORM_URL_PREFIXES[platform];
}

export function socialUrlPrefix(
  platform: SocialMediaPlatform,
): string | undefined {
  return SOCIAL_URL_PREFIXES[platform];
}

/** Strip a known prefix from a stored full URL for path-only editing. */
export function pathFromStoredUrl(
  prefix: string | undefined,
  stored: string,
): string {
  const value = stored.trim();
  if (!value || !prefix) return value;

  if (value.startsWith(prefix)) {
    return value.slice(prefix.length).replace(/^\//, "");
  }

  const barePrefix = prefix.replace(/\/$/, "");
  if (value.startsWith(barePrefix)) {
    return value.slice(barePrefix.length).replace(/^\//, "");
  }

  return value;
}

/** If the user pastes a full URL, keep only the path segment for prefixed fields. */
export function stripPastedPrefix(
  prefix: string | undefined,
  raw: string,
): string {
  const value = raw.trim();
  if (!prefix || !value) return value;
  return pathFromStoredUrl(prefix, value);
}

/** Build the full URL sent to the API from prefix + user path (or freeform for Web/Other). */
export function buildPrefixedUrl(
  prefix: string | undefined,
  pathOrFull: string,
): string {
  const value = pathOrFull.trim();
  if (!value) return "";

  if (!prefix) {
    return /^https?:\/\//i.test(value) ? value : `https://${value}`;
  }

  const withoutLeadingSlash = value.replace(/^\//, "");
  if (/^https?:\/\//i.test(withoutLeadingSlash)) {
    return withoutLeadingSlash;
  }

  return `${prefix}${withoutLeadingSlash}`;
}

export function isValidPrefixedListingPath(
  prefix: string,
  path: string,
): boolean {
  const trimmed = path.trim();
  if (!trimmed) return false;
  if (/\s/.test(trimmed)) return false;
  if (/^https?:\/\//i.test(trimmed)) return false;
  return buildPrefixedUrl(prefix, trimmed).length > prefix.length;
}

export function isValidFreeformListingUrl(raw: string): boolean {
  const full = buildPrefixedUrl(undefined, raw);
  if (!full) return false;
  try {
    const parsed = new URL(full);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function linkUrlRecordFromEntries<T extends string>(
  entries?: { platform: T; url: string }[] | null,
  getPrefix?: (platform: T) => string | undefined,
): Partial<Record<T, string>> {
  const out: Partial<Record<T, string>> = {};
  for (const entry of entries ?? []) {
    const url = entry.url?.trim();
    const platform =
      typeof entry.platform === "string"
        ? (entry.platform === "twitter" ? "x" : entry.platform)
        : entry.platform;
    if (!url) continue;
    const prefix = getPrefix?.(platform as T);
    out[platform as T] = prefix ? pathFromStoredUrl(prefix, url) : url;
  }
  return out;
}

export function linkUrlEntriesFromRecord<T extends string>(
  selected: T[],
  urls: Partial<Record<T, string>>,
  getPrefix?: (platform: T) => string | undefined,
): { platform: T; url: string }[] {
  return selected
    .map((platform) => ({
      platform,
      url: buildPrefixedUrl(
        getPrefix?.(platform),
        String(urls[platform] ?? ""),
      ),
    }))
    .filter((entry) => entry.url.length > 0);
}
