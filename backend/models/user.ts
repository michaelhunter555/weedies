import mongoose from "mongoose";

type UserMode = "customer" | "seller";
export interface User {
  name: string;
  email: string;
  password?: string;
  mode?: UserMode;
  role: "user" | "admin";
  authProvider: "local" | "firebase" | "google";

  // Provider identifiers (only one is populated depending on authProvider)
  firebaseUid?: string;
  googleSub?: string;

  // Auth
  refreshTokenHash?: string;
  lastLoginDate?: Date;

  // Marketplace-creator counters (driven by aggregates / background jobs)
  totalListings: number;
  totalListingsSold: number;
  totalSales: number;
  totalReviews: number;

  // Generic "cred" / rewards counter — kept as a lightweight engagement metric
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
}

const UserSchema = new mongoose.Schema<User>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
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

    firebaseUid: { type: String, required: false, default: null, index: true },
    googleSub: { type: String, required: false, default: null, index: true },

    refreshTokenHash: { type: String, required: false, default: null },
    lastLoginDate: { type: Date, required: false, default: null },

    totalListings: { type: Number, required: true, default: 0 },
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
  },
  { timestamps: true }
);

export default mongoose.models.User ||
  mongoose.model<User>("User", UserSchema);
