import mongoose from "mongoose";
import {
  AnalyticsProvider,
  ListingCategory,
  ListingDifficulty,
  ListingSaleType,
  ListingStatus,
  ListingTurnaround,
} from "../types";

/**
 * Marketplace listing — a single vibecoded app a seller is offering.
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

  // Seller-reported traction — verified via analytics integrations
  monthlyRevenue?: number;
  monthlyActiveUsers?: number;

  // Verification / trust
  hasSalesToVerify: boolean;
  hasAnalyticsToVerify: boolean;
  verifiedProviders: AnalyticsProvider[];
  isListingVerified: boolean;
  isAnalyticsVerified: boolean;

  // Moderation / lifecycle
  status: ListingStatus;
  rejectionReason?: string;
  agreedToTermsAt?: Date;
  publishedAt?: Date;
  soldAt?: Date;
  buyerId?: mongoose.Types.ObjectId;

  // Engagement aggregates (maintained by background jobs / controllers)
  favoritesCount: number;
  totalReviews: number;
  averageRating: number;
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

    appName: { type: String, required: true, trim: true, maxlength: 80 },
    tagline: { type: String, required: true, trim: true, maxlength: 140 },
    appDescription: { type: String, required: true, maxlength: 8000 },
    category: {
      type: String,
      required: true,
      enum: [
        "ai-tools",
        "productivity",
        "games",
        "dev-tools",
        "design",
        "extensions",
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
    currency: { type: String, required: true, default: "USD", uppercase: true },

    photos: { type: [String], required: true, default: [] },
    coverIndex: { type: Number, required: true, default: 0, min: 0 },
    demoUrl: { type: String, required: false },
    repoUrl: { type: String, required: false },
    liveUrl: { type: String, required: false },

    tags: { type: [String], required: true, default: [], index: true },
    techStack: { type: [String], required: true, default: [] },

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

    status: {
      type: String,
      required: true,
      enum: [
        "draft",
        "pending_review",
        "live",
        "paused",
        "rejected",
        "sold",
        "removed",
      ],
      default: "pending_review",
      index: true,
    },
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
    totalReviews: { type: Number, required: true, default: 0, min: 0 },
    averageRating: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 5,
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
