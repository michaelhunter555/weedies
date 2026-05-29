import type { HydratedDocument } from "mongoose";
import type { User } from "../models/user";
import { AccountStatus } from "../types/account-status";

/**
 * Canonical JSON shape for `/user/login`, `/user/me`, etc.
 * Keep in sync with `normalizeUser` on the client.
 */
export function toAppUserJson(user: HydratedDocument<User>) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    emailVerified: Boolean(user.emailVerified),
    role: user.role,
    accountStanding: user.accountStanding ?? AccountStatus.GOOD,
    authProvider: user.authProvider,
    firebaseUid: user.firebaseUid ?? null,
    googleSub: user.googleSub ?? null,

    totalListings: user.totalListings ?? 0,
    totalSales: user.totalSales ?? 0,
    totalReviews: user.totalReviews ?? 0,
    rewardPoints: user.rewardPoints ?? 0,

    stripeCustomerId: user.stripeCustomerId ?? null,
    stripeConnectAccountId: user.stripeConnectAccountId ?? null,
    /** Same id as `stripeConnectAccountId` - Connect Express account id. */
    stripeAccountId: user.stripeConnectAccountId ?? null,
    outstandingBalance: user.outstandingBalance ?? 0,
    defaultPaymentIntendId: user.defaultPaymentIntendId ?? null,

    isVerifiedCreator: user.isVerifiedCreator ?? false,
    hasVerifiedAnalytics: user.hasVerifiedAnalytics ?? false,
    isOnboarded: user.isOnboarded ?? false,

    lastLoginDate: user.lastLoginDate ?? null,
    timezone: user.timezone ?? null,
    locale: user.locale ?? null,
    createdAt: (user as { createdAt?: Date }).createdAt,
    updatedAt: (user as { updatedAt?: Date }).updatedAt,
  };
}
