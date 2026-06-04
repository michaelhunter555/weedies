import type { ListingCategory } from "../types";

/** All valid listing category slugs (keep in sync with `models/listing.ts` enum). */
export const LISTING_CATEGORY_VALUES: ListingCategory[] = [
  "ai-tools",
  "productivity",
  "games",
  "dev-tools",
  "extensions",
  "service",
  "saas",
  "marketplace",
];

/** Legacy slugs stored on older listings before taxonomy changes. */
const LEGACY_CATEGORY_ALIASES: Record<string, ListingCategory> = {
  design: "service",
};

export function normalizeListingCategory(raw: unknown): ListingCategory | null {
  const slug = String(raw ?? "").trim();
  if (!slug) return null;
  const normalized = LEGACY_CATEGORY_ALIASES[slug] ?? slug;
  return LISTING_CATEGORY_VALUES.includes(normalized as ListingCategory)
    ? (normalized as ListingCategory)
    : null;
}

export function pickListingCategory(
  raw: unknown,
  fallback: ListingCategory = "ai-tools",
): ListingCategory {
  return normalizeListingCategory(raw) ?? fallback;
}
