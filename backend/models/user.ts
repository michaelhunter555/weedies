import mongoose from "mongoose";
import { AccountStatus } from "../types/account-status";

type UserMode = "customer" | "seller";
export interface User {
  name: string;
  /** Optional avatar URL (e.g. for chat participant chips). */
  image?: string | null;
  email: string;
  emailVerified: boolean;
  password?: string;
  mode?: UserMode;
  role: "user" | "admin";
  authProvider: "local" | "firebase" | "google";
  accountStanding: AccountStatus;
  sellerRating?: number;
  totalSellerReviews?: number;

  // Provider identifiers (only one is populated depending on authProvider)
  firebaseUid?: string;
  googleSub?: string;

  // Auth
  refreshTokenHash?: string;
  lastLoginDate?: Date;

  /** IANA timezone from the client, e.g. `America/New_York`. */
  timezone?: string;
  /** BCP 47 locale from the client, e.g. `en-US`. */
  locale?: string;

  // Marketplace-creator counters (driven by aggregates / background jobs)
  totalListings: number;
  totalListingsSold: number;
  totalSales: number;
  totalReviews: number;

  // Generic "cred" / rewards counter - kept as a lightweight engagement metric
  // so existing UI references (client `UserObject.rewardPoints`) keep working.
  rewardPoints: number;

  // Payouts / billing
  stripeCustomerId?: string;
  stripeConnectAccountId?: string;
  outstandingBalance: number;

  // Verification badges surfaced on listings
  isVerifiedCreator: boolean;
  hasVerifiedAnalytics: boolean;
  isOnboarded?: boolean;
  defaultPaymentIntendId?: string;

  /** Encrypted GA OAuth material - only ever ciphertext from `encryptData`. */
  googleAnalyticsOAuth?: {
    accessTokenEnc: string | null;
    refreshTokenEnc: string | null;
    accessTokenExpiresAt: Date | null;
  };

}

const UserSchema = new mongoose.Schema<User>(
  {
    name: { type: String, required: true },
    image: { type: String, required: false, default: null },
    email: { type: String, required: true, unique: true, index: true },
    emailVerified: { type: Boolean, required: true, default: false },
    password: { type: String, required: false, default: null },
    role: {
      type: String,
      required: true,
      enum: ["user", "admin"],
      default: "user",
    },
    authProvider: {
      type: String,
      required: true,
      enum: ["local", "firebase", "google"],
      default: "local",
    },

    mode: {
      type: String,
      required: false,
      enum: ["customer", "seller"],
      default: "customer",
    },

    firebaseUid: { type: String, required: false, default: null, index: true },
    googleSub: { type: String, required: false, default: null, index: true },

    accountStanding: {
      type: String,
      required: true,
      enum: Object.values(AccountStatus),
      default: AccountStatus.GOOD,
      index: true,
    },

    refreshTokenHash: { type: String, required: false, default: null },
    lastLoginDate: { type: Date, required: false, default: null },
    timezone: { type: String, required: false, default: null },
    locale: { type: String, required: false, default: null },

    sellerRating: { type: Number, required: false, default: 0 },
    totalSellerReviews: { type: Number, required: false, default: 0 },
    totalListings: { type: Number, required: true, default: 0 },
    totalListingsSold: { type: Number, required: true, default: 0 },
    totalSales: { type: Number, required: true, default: 0 },
    totalReviews: { type: Number, required: true, default: 0 },
    rewardPoints: { type: Number, required: true, default: 0 },

    stripeCustomerId: { type: String, required: false, default: null },
    stripeConnectAccountId: { type: String, required: false, default: null },
    outstandingBalance: { type: Number, required: true, default: 0 },

    isVerifiedCreator: { type: Boolean, required: true, default: false },
    hasVerifiedAnalytics: { type: Boolean, required: true, default: false },
    isOnboarded: { type: Boolean, required: true, default: false },
    defaultPaymentIntendId: { type: String, required: false, default: null },

    googleAnalyticsOAuth: {
      type: {
        accessTokenEnc: { type: String, default: null },
        refreshTokenEnc: { type: String, default: null },
        accessTokenExpiresAt: { type: Date, default: null },
      },
      required: false,
      default: undefined,
    },

  },
  { timestamps: true }
);

export default mongoose.models.User ||
  mongoose.model<User>("User", UserSchema);
