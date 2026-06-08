export type TShippingAddress = {
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    zip: string;
    country: string;
};

// =========================
// Marketplace listings
// =========================

export type ListingCategory =
    | "ai-tools"
    | "productivity"
    | "games"
    | "dev-tools"
    | "extensions"
    | "service"
    | "saas"
    | "marketplace";

export type ListingTurnaround = "24h" | "3d" | "1w" | "2w" | "1m";

export type ListingDifficulty = "beginner" | "intermediate" | "advanced";

/**
 * Lifecycle of a listing in the marketplace. Listings start as `draft` while
 * the seller is still filling out the form, move to `pending_review` on
 * submit, `live` once approved, and end in `sold` / `removed` / `rejected`.
 * `paused` is a seller-initiated hide without deleting.
 */
export type ListingStatus =
    | "draft"
    | "pending_listing_fee"
    | "pending_review"
    | "live"
    | "reserved"
    | "paused"
    | "expired"
    | "rejected"
    | "sold"
    | "removed";

/**
 * How the listing is priced. Fixed = starting-price + optional buy-it-now,
 * auction = time-bounded bidding.
 */
export type ListingSaleType = "fixed" | "auction";

/**
 * Third-party providers a seller can connect to verify sales / analytics.
 * Mirrors the client-side AnalyticsProvider in client/types.tsx.
 */
export type AnalyticsProvider =
    | "revenuecat"
    | "google-analytics"
    | "stripe"
    | "mixpanel"
    | "plausible";

/**
 * Platforms a listing is available on, meaning a working version.
 *  i.e. if a user has an app on ios, android and web, they would select all three.
 */
export type Platforms =
    "ios"
    | "android"
    | "web"
    | "macOs"
    | "windows"
    | "chromeExtension"
    | "other";


export type SocialMediaPlatform = "instagram" | "x" | "youtube" | "facebook" | "tiktok" | "linkedin" | "discord" | "other";