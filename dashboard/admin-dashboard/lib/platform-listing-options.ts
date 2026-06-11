export const PLATFORM_LISTING_CATEGORIES = [
  { value: "ai-tools", label: "AI tools" },
  { value: "productivity", label: "Productivity" },
  { value: "games", label: "Games" },
  { value: "dev-tools", label: "Dev tools" },
  { value: "extensions", label: "Extensions" },
  { value: "service", label: "Service" },
  { value: "saas", label: "SaaS" },
  { value: "marketplace", label: "Marketplace" },
] as const;

export const PLATFORM_LISTING_DIFFICULTIES = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
] as const;

export const PLATFORM_LISTING_TURNAROUNDS = [
  { value: "24h", label: "24 hours" },
  { value: "3d", label: "3 days" },
  { value: "1w", label: "1 week" },
  { value: "2w", label: "2 weeks" },
  { value: "1m", label: "1 month" },
] as const;

export const PLATFORM_LISTING_PLATFORMS = [
  { value: "ios", label: "iOS" },
  { value: "android", label: "Android" },
  { value: "web", label: "Web" },
  { value: "macOs", label: "macOS" },
  { value: "windows", label: "Windows" },
  { value: "chromeExtension", label: "Chrome extension" },
  { value: "other", label: "Other" },
] as const;

export type PlatformListingPlatform =
  (typeof PLATFORM_LISTING_PLATFORMS)[number]["value"];

export const PLATFORM_LISTING_SOCIAL_MEDIA = [
  { value: "instagram", label: "Instagram", urlPrefix: "https://www.instagram.com/" },
  { value: "x", label: "X", urlPrefix: "https://www.x.com/" },
  { value: "youtube", label: "YouTube", urlPrefix: "https://www.youtube.com/" },
  { value: "facebook", label: "Facebook", urlPrefix: "https://www.facebook.com/" },
  { value: "linkedin", label: "LinkedIn", urlPrefix: "https://www.linkedin.com/" },
  { value: "tiktok", label: "TikTok", urlPrefix: "https://www.tiktok.com/" },
  { value: "discord", label: "Discord", urlPrefix: "https://discord.com/" },
  { value: "other", label: "Other" },
] as const;

export type PlatformListingSocialMedia =
  (typeof PLATFORM_LISTING_SOCIAL_MEDIA)[number]["value"];

const emptySocialUrls = (): Record<PlatformListingSocialMedia, string> =>
  Object.fromEntries(
    PLATFORM_LISTING_SOCIAL_MEDIA.map((p) => [p.value, ""]),
  ) as Record<PlatformListingSocialMedia, string>;

export { emptySocialUrls };
