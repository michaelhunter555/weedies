import type { Platforms, SocialMediaPlatform } from "../types";

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
  tiktok: "https://www.tiktok.com/",
  linkedin: "https://www.linkedin.com/",
  discord: "https://discord.com/",
};

const PLATFORM_VALUES = new Set<Platforms>([
  "ios",
  "android",
  "web",
  "macOs",
  "windows",
  "chromeExtension",
  "other",
]);

const SOCIAL_MEDIA_VALUES = new Set<SocialMediaPlatform>([
  "instagram",
  "x",
  "youtube",
  "facebook",
  "tiktok",
  "linkedin",
  "discord",
  "other",
]);

export function normalizeListingHttpUrl(raw: unknown): string | null {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return null;
  try {
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProto);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function pickPlatforms(raw: unknown): Platforms[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((v) => String(v).trim())
    .filter((v): v is Platforms => PLATFORM_VALUES.has(v as Platforms));
}

export function normalizeSocialMediaValue(raw: string): SocialMediaPlatform | null {
  const normalized = raw.trim().toLowerCase() === "twitter" ? "x" : raw.trim();
  return SOCIAL_MEDIA_VALUES.has(normalized as SocialMediaPlatform)
    ? (normalized as SocialMediaPlatform)
    : null;
}

function pickSocialMedia(raw: unknown): SocialMediaPlatform[] {
  if (!Array.isArray(raw)) return [];
  const out: SocialMediaPlatform[] = [];
  for (const v of raw) {
    const platform = normalizeSocialMediaValue(String(v));
    if (platform && !out.includes(platform)) out.push(platform);
  }
  return out;
}

function urlMapFromEntries(raw: unknown): Map<string, string> {
  const map = new Map<string, string>();
  if (!Array.isArray(raw)) return map;
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const platform = String((entry as { platform?: unknown }).platform ?? "").trim();
    const url = normalizeListingHttpUrl((entry as { url?: unknown }).url);
    if (platform && url) {
      map.set(platform, url);
    }
  }
  return map;
}

function socialUrlMapFromEntries(raw: unknown): Map<string, string> {
  const map = new Map<string, string>();
  if (!Array.isArray(raw)) return map;
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const rawPlatform = String((entry as { platform?: unknown }).platform ?? "").trim();
    const platform = normalizeSocialMediaValue(rawPlatform);
    const url = normalizeListingHttpUrl((entry as { url?: unknown }).url);
    if (platform && url) {
      map.set(platform, url);
    }
  }
  return map;
}

export const PLATFORM_LABELS: Record<Platforms, string> = {
  ios: "iOS",
  android: "Android",
  web: "Web",
  macOs: "macOS",
  windows: "Windows",
  chromeExtension: "Chrome extension",
  other: "Other",
};

export const SOCIAL_LABELS: Record<SocialMediaPlatform, string> = {
  instagram: "Instagram",
  x: "X",
  youtube: "YouTube",
  facebook: "Facebook",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  discord: "Discord",
  other: "Other",
};

export function applyListingLinkFields(
  payload: Record<string, unknown>,
  options?: { requirePlatformUrls?: boolean },
): { ok: true; data: Record<string, unknown> } | { ok: false; message: string } {
  const requirePlatformUrls = options?.requirePlatformUrls ?? false;
  const platforms =
    "platforms" in payload ? pickPlatforms(payload.platforms) : undefined;
  const socialMedia =
    "socialMedia" in payload ? pickSocialMedia(payload.socialMedia) : undefined;

  const data = { ...payload };

  if (platforms !== undefined) {
    data.platforms = platforms;
    const urlMap = urlMapFromEntries(payload.platformUrls);
    const platformUrls: { platform: Platforms; url: string }[] = [];

    for (const platform of platforms) {
      const url = urlMap.get(platform) ?? null;
      if (!url) {
        if (requirePlatformUrls) {
          return {
            ok: false,
            message: `Add a public URL for ${PLATFORM_LABELS[platform]}.`,
          };
        }
        continue;
      }
      platformUrls.push({ platform, url });
    }

    data.platformUrls = platformUrls;
  }

  if (socialMedia !== undefined) {
    data.socialMedia = socialMedia;
    const urlMap = socialUrlMapFromEntries(payload.socialMediaUrls);
    const socialMediaUrls: { platform: SocialMediaPlatform; url: string }[] = [];

    for (const platform of socialMedia) {
      const url = urlMap.get(platform);
      if (url) {
        socialMediaUrls.push({ platform, url });
      }
    }

    data.socialMediaUrls = socialMediaUrls;
  }

  return { ok: true, data };
}

export type ListingLinkCheckStatus =
  | "ok"
  | "missing"
  | "invalid_url"
  | "wrong_domain"
  | "not_required";

export type ListingLinkCheck = {
  platform: string;
  label: string;
  url: string | null;
  expectedPrefix: string | null;
  status: ListingLinkCheckStatus;
  message: string;
};

function urlStartsWithPrefix(url: string, prefix: string): boolean {
  const bare = prefix.replace(/\/$/, "");
  return url.startsWith(prefix) || url.startsWith(`${bare}/`);
}

export function checkPlatformListingUrl(
  platform: Platforms,
  url: string | null | undefined,
): ListingLinkCheck {
  const label = PLATFORM_LABELS[platform] ?? platform;
  const prefix = PLATFORM_URL_PREFIXES[platform];
  const normalized = url ? normalizeListingHttpUrl(url) : null;

  if (!normalized) {
    return {
      platform,
      label,
      url: null,
      expectedPrefix: prefix ?? null,
      status: "missing",
      message: prefix
        ? `Missing ${label} store link (expected ${prefix}…)`
        : `Missing ${label} URL`,
    };
  }

  if (!prefix) {
    return {
      platform,
      label,
      url: normalized,
      expectedPrefix: null,
      status: "ok",
      message: "Freeform URL",
    };
  }

  if (!urlStartsWithPrefix(normalized, prefix)) {
    return {
      platform,
      label,
      url: normalized,
      expectedPrefix: prefix,
      status: "wrong_domain",
      message: `URL should start with ${prefix}`,
    };
  }

  return {
    platform,
    label,
    url: normalized,
    expectedPrefix: prefix,
    status: "ok",
    message: "Domain matches",
  };
}

export function checkSocialListingUrl(
  platform: SocialMediaPlatform,
  url: string | null | undefined,
  required: boolean,
): ListingLinkCheck {
  const label = SOCIAL_LABELS[platform] ?? platform;
  const prefix = SOCIAL_URL_PREFIXES[platform];
  const normalized = url ? normalizeListingHttpUrl(url) : null;

  if (!normalized) {
    return {
      platform,
      label,
      url: null,
      expectedPrefix: prefix ?? null,
      status: required ? "missing" : "not_required",
      message: required
        ? prefix
          ? `Missing ${label} link (expected ${prefix}…)`
          : `Missing ${label} URL`
        : "No URL provided (optional)",
    };
  }

  if (!prefix) {
    return {
      platform,
      label,
      url: normalized,
      expectedPrefix: null,
      status: "ok",
      message: "Freeform URL",
    };
  }

  if (!urlStartsWithPrefix(normalized, prefix)) {
    return {
      platform,
      label,
      url: normalized,
      expectedPrefix: prefix,
      status: "wrong_domain",
      message: `URL should start with ${prefix}`,
    };
  }

  return {
    platform,
    label,
    url: normalized,
    expectedPrefix: prefix,
    status: "ok",
    message: "Domain matches",
  };
}
