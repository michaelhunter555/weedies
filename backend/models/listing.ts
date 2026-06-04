import mongoose from "mongoose";
import {
  AnalyticsProvider,
  ListingCategory,
  ListingDifficulty,
  ListingSaleType,
  ListingStatus,
  ListingTurnaround,
  Platforms,
} from "../types";

/**
 * Marketplace listing - a single vibecoded app a seller is offering.
 *
 * Mirrors the submission form at /products?list=new (see
 * `client/src/app/products/page.tsx`) plus moderation, engagement and
 * verification metadata.
 */
export interface Listing {
  // Ownership / routing
  sellerId: mongoose.Types.ObjectId;
  slug: string;
  views: number;
  paymentIntentId?: string;
  // Core details (from the submission form)
  appName: string;
  tagline: string;
  appDescription: string;
  category: ListingCategory;
  difficulty: ListingDifficulty;
  turnaround: ListingTurnaround;
  ageOfBusinessMonths: number;

  // Pricing / sale
  saleType: ListingSaleType;
  startingPrice: number;
  buyItNowPrice?: number;
  auctionStartDate?: Date;
  auctionEndDate?: Date;
  /** Set when cron finalizes an ended auction (winner reserved or no sale). */
  auctionFinalizedAt?: Date;
  /** When the listing expired without a sale (purge cron uses this). */
  expiredAt?: Date;
  /** One-shot flag so ending-soon emails are not duplicated. */
  auctionEndingSoonNotifiedAt?: Date;
  /** High bid in dollars when status moves to `reserved` after auction end. */
  auctionWinningAmount?: number;
  currency: string;

  // Media & supporting links
  photos: string[];
  coverIndex: number;
  demoUrl?: string;
  repoUrl?: string;
  liveUrl?: string;

  // Freeform metadata (used for search + filters)
  tags: string[];
  techStack: string[];
  platforms: Platforms[];

  // Seller-reported traction - verified via analytics integrations
  monthlyRevenue?: number;
  monthlyActiveUsers?: number;

  // Verification / trust
  hasSalesToVerify: boolean;
  hasAnalyticsToVerify: boolean;
  verifiedProviders: AnalyticsProvider[];
  isListingVerified: boolean;
  isAnalyticsVerified: boolean;

  /** GA4 property linked for verified metrics (set after OAuth + picker). */
  googleAnalyticsPropertyResourceName?: string;
  googleAnalyticsPropertyDisplayName?: string;
  /** RevenueCat project metadata (future API / OAuth). */
  revenueCatProjectId?: string;
  revenueCatProjectDisplayName?: string;

  // Moderation / lifecycle
  status: ListingStatus;
  /** When the seller’s listing slot / fee was applied (prevents double-charge on resubmit). */
  sellerCommittedAt?: Date;
  rejectionReason?: string;
  agreedToTermsAt?: Date;
  publishedAt?: Date;
  soldAt?: Date;
  buyerId?: mongoose.Types.ObjectId;

  // Engagement aggregates (maintained by background jobs / controllers)
  favoritesCount: number;
  totalReviews: number;
  averageRating: number;
  /**
   * Reserved for auction bid recording - when > 0, seller cannot edit listing fields.
   * Increment from bid-placement APIs when implemented.
   */
  openBidCount?: number;
  /**
   * Placed bids. Subdocuments include `_id` (Mongo) for PATCH `/bids/:bidId`.
   * Serialized on seller mine / bid PATCH; omitted on public GET (use auction summary fields).
   */
  auctionBids?: {
    _id?: mongoose.Types.ObjectId;
    bidderId: mongoose.Types.ObjectId;
    amount: number;
    createdAt: Date;
    bidStatus: "pending" | "accepted" | "rejected";
  }[];

  /** Number of users following this listing. Intended for auctions only.*/
  auctionFollowers?: mongoose.Types.ObjectId[];

  isPrivateListing?: boolean;
  /** Set after the $4.99 private add-on is charged (create or edit). */
  privateListingFeePaid?: boolean;
  approvedUsersList?: string[] | null;
  pendingPrivateListingRequests?: {
    _id?: mongoose.Types.ObjectId;
    requesterId: mongoose.Types.ObjectId;
    status: "pending" | "approved" | "denied";
    /** Optional note from the requester when asking for access. */
    message?: string;
    createdAt: Date;
    resolvedAt?: Date;
  }[];
}

const ListingSchema = new mongoose.Schema<Listing>(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    slug: { type: String, required: true, unique: true, index: true },

    /** Listing-fee Stripe PaymentIntent (manual capture). Used by admin to capture or cancel after review. */
    paymentIntentId: { type: String, required: false, default: null, index: true },

    appName: { type: String, required: true, trim: true, maxlength: 80 },
    tagline: { type: String, required: true, trim: true, maxlength: 80 },
    appDescription: { type: String, required: true, maxlength: 16000 },
    category: {
      type: String,
      required: true,
      enum: [
        "ai-tools",
        "productivity",
        "games",
        "dev-tools",
        "extensions",
        "service",
        "saas",
        "marketplace",
      ],
      index: true,
    },
    difficulty: {
      type: String,
      required: true,
      enum: ["beginner", "intermediate", "advanced"],
      index: true,
    },
    turnaround: {
      type: String,
      required: true,
      enum: ["24h", "3d", "1w", "2w", "1m"],
    },
    ageOfBusinessMonths: { type: Number, required: true, default: 0, min: 0 },

    saleType: {
      type: String,
      required: true,
      enum: ["fixed", "auction"],
      default: "fixed",
      index: true,
    },
    startingPrice: { type: Number, required: true, min: 0 },
    buyItNowPrice: { type: Number, required: false, min: 0 },
    auctionStartDate: { type: Date, required: false },
    auctionEndDate: { type: Date, required: false },
    auctionFinalizedAt: { type: Date, required: false },
    expiredAt: { type: Date, required: false },
    auctionEndingSoonNotifiedAt: { type: Date, required: false },
    auctionWinningAmount: { type: Number, required: false, min: 0 },
    currency: { type: String, required: true, default: "USD", uppercase: true },

    photos: { type: [String], required: true, default: [] },
    coverIndex: { type: Number, required: true, default: 0, min: 0 },
    demoUrl: { type: String, required: false },
    repoUrl: { type: String, required: false },
    liveUrl: { type: String, required: false },

    tags: { type: [String], required: true, default: [], index: true },
    techStack: { type: [String], required: true, default: [] },
    platforms: { type: [String], required: true, default: [], enum: ["ios", "android", "web", "macOs", "windows", "chromeExtension", "other"] },
    monthlyRevenue: { type: Number, required: false, min: 0 },
    monthlyActiveUsers: { type: Number, required: false, min: 0 },

    hasSalesToVerify: { type: Boolean, required: true, default: false },
    hasAnalyticsToVerify: { type: Boolean, required: true, default: false },
    verifiedProviders: {
      type: [String],
      required: true,
      default: [],
      enum: [
        "revenuecat",
        "google-analytics",
        "stripe",
        "mixpanel",
        "plausible",
      ],
    },
    isListingVerified: { type: Boolean, required: true, default: false },
    isAnalyticsVerified: { type: Boolean, required: true, default: false },

    googleAnalyticsPropertyResourceName: {
      type: String,
      required: false,
      default: null,
    },
    googleAnalyticsPropertyDisplayName: {
      type: String,
      required: false,
      default: null,
    },
    revenueCatProjectId: { type: String, required: false, default: null },
    revenueCatProjectDisplayName: {
      type: String,
      required: false,
      default: null,
    },

    status: {
      type: String,
      required: true,
      enum: [
        "draft",
        "pending_listing_fee",
        "pending_review",
        "live",
        "reserved",
        "paused",
        "expired",
        "rejected",
        "sold",
        "removed",
      ],
      default: "pending_review",
      index: true,
    },
    sellerCommittedAt: { type: Date, required: false, default: null },
    rejectionReason: { type: String, required: false },
    agreedToTermsAt: { type: Date, required: false },
    publishedAt: { type: Date, required: false },
    soldAt: { type: Date, required: false },
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    views: { type: Number, required: true, default: 0, min: 0 },
    favoritesCount: { type: Number, required: true, default: 0, min: 0 },
    /** Increment when bids are persisted - blocks seller edits while > 0. */
    openBidCount: { type: Number, required: true, default: 0, min: 0 },
    auctionBids: {
      type: [
        {
          bidderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },
          amount: { type: Number, required: true, min: 0 },
          createdAt: { type: Date, default: Date.now },
          bidStatus: {
            type: String,
            required: true,
            enum: ["pending", "accepted", "rejected"],
            default: "pending",
          },
        },
      ],
      default: [],
    },
    totalReviews: { type: Number, required: true, default: 0, min: 0 },
    averageRating: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 5,
    },
    isPrivateListing: { type: Boolean, required: false, default: false },
    privateListingFeePaid: { type: Boolean, required: false, default: false },
    approvedUsersList: { type: [String], required: false, default: null },
    pendingPrivateListingRequests: {
      type: [
        {
          requesterId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },
          status: {
            type: String,
            required: true,
            enum: ["pending", "approved", "denied"],
            default: "pending",
          },
          message: { type: String, required: false, default: null, maxlength: 500 },
          createdAt: { type: Date, required: true, default: Date.now },
          resolvedAt: { type: Date, required: false, default: null },
        },
      ],
      required: false,
      default: [],
    },
    auctionFollowers: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      required: false,
      default: [],
    },
  },
  { timestamps: true }
);

// Common filter combinations (discovery page)
ListingSchema.index({ status: 1, category: 1, createdAt: -1 });
ListingSchema.index({ status: 1, saleType: 1, auctionEndDate: 1 });

// Full-text search across user-facing copy
ListingSchema.index(
  { appName: "text", tagline: "text", appDescription: "text", tags: "text" },
  { weights: { appName: 10, tagline: 6, tags: 4, appDescription: 1 } }
);

// Auto-stamp publishedAt the first time a listing goes live.
ListingSchema.pre("save", function (next) {
  if (this.isModified("status") && this.status === "live" && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  if (this.isModified("status") && this.status === "sold" && !this.soldAt) {
    this.soldAt = new Date();
  }
  next();
});

export default mongoose.models.Listing ||
  mongoose.model<Listing>("Listing", ListingSchema);
