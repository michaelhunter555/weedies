import crypto from "crypto";
import type { Listing } from "../models/listing";
import type { Platforms } from "../types";

export const STORE_LISTING_CODE_PREFIX = "DAPANDFLIP-VERIFY-";

export type OwnershipVerifiedVia = "well_known" | "store_listing";

/** Public path sellers host on their web app origin. */
export const OWNERSHIP_VERIFICATION_WELL_KNOWN_PATH =
  "/.well-known/dap-and-flip-app-verification.txt";

export const OWNERSHIP_VERIFICATION_FILE_NAME =
  "dap-and-flip-app-verification.txt";

export type OwnershipVerificationGuideMethod =
  | "web_well_known"
  | "website_required"
  | "native_store_listing"
  | "native_use_website";

export type OwnershipVerificationPlatformGuide = {
  platform: Platforms;
  label: string;
  method: OwnershipVerificationGuideMethod;
  storeListingUrl?: string;
};

export function generateStoreListingVerificationCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(6);
  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    suffix += chars[bytes[i]! % chars.length];
  }
  return `${STORE_LISTING_CODE_PREFIX}${suffix}`;
}

export type StoreListingUrlTargets = {
  ios?: string;
  android?: string;
};

function normalizeStoreListingUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const withScheme = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    return new URL(withScheme).toString();
  } catch {
    return null;
  }
}

export function resolveStoreListingUrls(
  listing: Pick<Listing, "platformUrls">,
): StoreListingUrlTargets {
  const out: StoreListingUrlTargets = {};
  for (const row of listing.platformUrls ?? []) {
    if (row.platform !== "ios" && row.platform !== "android") continue;
    const url = normalizeStoreListingUrl(row.url);
    if (!url) continue;
    out[row.platform] = url;
  }
  return out;
}

const STORE_LISTING_HOSTS = new Set([
  "apps.apple.com",
  "itunes.apple.com",
  "play.google.com",
]);

export function isAllowedStoreListingFetchUrl(urlStr: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  return STORE_LISTING_HOSTS.has(parsed.hostname.toLowerCase());
}

function normalizeOriginFromUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const withScheme = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const parsed = new URL(withScheme);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

export function resolveListingWebOrigin(
  listing: Pick<Listing, "platformUrls" | "liveUrl">,
): string | null {
  const webRow = (listing.platformUrls ?? []).find((row) => row.platform === "web");
  if (webRow?.url) {
    const fromPlatform = normalizeOriginFromUrl(webRow.url);
    if (fromPlatform) return fromPlatform;
  }
  if (listing.liveUrl) {
    return normalizeOriginFromUrl(listing.liveUrl);
  }
  return null;
}

export function buildWellKnownVerificationUrl(origin: string): string {
  const base = origin.replace(/\/+$/, "");
  return `${base}${OWNERSHIP_VERIFICATION_WELL_KNOWN_PATH}`;
}

/** Block SSRF when fetching seller-controlled origins. */
export function isSafeVerificationFetchUrl(urlStr: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return false;
  }

  if (!["http:", "https:"].includes(parsed.protocol)) return false;

  const host = parsed.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
    return process.env.NODE_ENV !== "production";
  }

  if (
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host.endsWith(".local")
  ) {
    return false;
  }

  return true;
}

const PLATFORM_LABELS: Record<Platforms, string> = {
  ios: "iOS",
  android: "Android",
  web: "Web",
  macOs: "macOS",
  windows: "Windows",
  chromeExtension: "Chrome extension",
  other: "Other",
};

export function ownershipVerificationGuidesForListing(
  listing: Pick<Listing, "platforms" | "platformUrls" | "liveUrl">,
): OwnershipVerificationPlatformGuide[] {
  const webOrigin = resolveListingWebOrigin(listing);
  const storeUrls = resolveStoreListingUrls(listing);
  const platforms = listing.platforms ?? [];

  return platforms.map((platform) => {
    if (platform === "web") {
      return {
        platform,
        label: PLATFORM_LABELS[platform],
        method: webOrigin ? ("web_well_known" as const) : ("website_required" as const),
      };
    }

    if (platform === "ios" || platform === "android") {
      const storeListingUrl = storeUrls[platform];
      return {
        platform,
        label: PLATFORM_LABELS[platform],
        method: storeListingUrl
          ? ("native_store_listing" as const)
          : ("native_use_website" as const),
        ...(storeListingUrl ? { storeListingUrl } : {}),
      };
    }

    return {
      platform,
      label: PLATFORM_LABELS[platform],
      method: "native_use_website" as const,
    };
  });
}

export type OwnershipVerificationCheckResult = {
  ok: boolean;
  method: OwnershipVerifiedVia;
  checkedUrl?: string;
  checkedUrls?: string[];
  message: string;
};

export async function checkRemoteOwnershipVerificationToken(
  origin: string,
  expectedToken: string,
): Promise<OwnershipVerificationCheckResult> {
  const checkedUrl = buildWellKnownVerificationUrl(origin);
  if (!isSafeVerificationFetchUrl(checkedUrl)) {
    return {
      ok: false,
      method: "well_known",
      checkedUrl,
      message: "That web URL cannot be checked from our servers.",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const res = await fetch(checkedUrl, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { Accept: "text/plain,*/*" },
    });

    if (!res.ok) {
      return {
        ok: false,
        method: "well_known",
        checkedUrl,
        message: `Could not reach the verification file (HTTP ${res.status}).`,
      };
    }

    const body = (await res.text()).trim();
    if (!body) {
      return {
        ok: false,
        method: "well_known",
        checkedUrl,
        message: "The verification file is empty.",
      };
    }

    if (body !== expectedToken.trim()) {
      return {
        ok: false,
        method: "well_known",
        checkedUrl,
        message: "The verification file does not contain your token.",
      };
    }

    return {
      ok: true,
      method: "well_known",
      checkedUrl,
      message: "Ownership verified via website file.",
    };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      method: "well_known",
      checkedUrl,
      message: aborted
        ? "Timed out while fetching your verification file."
        : "Could not fetch your verification file.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchStoreListingHtml(url: string): Promise<string | null> {
  if (!isAllowedStoreListingFetchUrl(url)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent":
          "Mozilla/5.0 (compatible; DapAndFlipOwnershipVerifier/1.0; +https://dapandflip.com)",
      },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkStoreListingVerificationCode(
  listing: Pick<Listing, "platforms" | "platformUrls">,
  expectedCode: string,
): Promise<OwnershipVerificationCheckResult> {
  const code = expectedCode.trim();
  const storeUrls = resolveStoreListingUrls(listing);
  const platforms = listing.platforms ?? [];
  const targets: { platform: Platforms; url: string }[] = [];

  if (platforms.includes("ios") && storeUrls.ios) {
    targets.push({ platform: "ios", url: storeUrls.ios });
  }
  if (platforms.includes("android") && storeUrls.android) {
    targets.push({ platform: "android", url: storeUrls.android });
  }

  if (!targets.length) {
    return {
      ok: false,
      method: "store_listing",
      message:
        "Add your App Store or Play Store listing URL on this listing before checking store verification.",
    };
  }

  const checkedUrls: string[] = [];
  const failures: string[] = [];

  for (const target of targets) {
    checkedUrls.push(target.url);
    const html = await fetchStoreListingHtml(target.url);
    if (!html) {
      failures.push(
        `Could not load your ${target.platform === "ios" ? "App Store" : "Play Store"} listing.`,
      );
      continue;
    }
    if (html.includes(code)) {
      return {
        ok: true,
        method: "store_listing",
        checkedUrl: target.url,
        checkedUrls,
        message: `Ownership verified via ${target.platform === "ios" ? "App Store" : "Play Store"} listing.`,
      };
    }
    failures.push(
      `Your ${target.platform === "ios" ? "App Store" : "Play Store"} listing does not contain your store verification code yet.`,
    );
  }

  return {
    ok: false,
    method: "store_listing",
    checkedUrls,
    message: failures[0] ?? "Store listing verification failed.",
  };
}
