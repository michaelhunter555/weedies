import mongoose from "mongoose";

import EarlyAdopterGrant, {
  type EarlyAdopterGrant as EarlyAdopterGrantDoc,
} from "../models/early-adopter-grant";
import Listing from "../models/listing";
import ListingExchange from "../models/exchange";
import UserModel, { type User } from "../models/user";
import { AccountStatus } from "../types/account-status";
import stripe from "../utils/stripe";

/**
 * Early-adopter signup promo (seller milestones).
 * All promo state lives on `EarlyAdopterGrant` (linked by `userId`).
 *
 * Wire-up (not done yet):
 * - Signup → `tryAssignEarlyAdopterOnSignup(userId)`
 * - Admin approves listing → `onAdminApprovedListing(sellerId, listingId)`
 * - Buyer confirms exchange → `onBuyerConfirmedExchange(sellerId)`
 * - Stripe Connect onboarding complete → `retryPendingEarlyAdopterBonuses(userId)`
 */

export const EARLY_ADOPTER_CAP = 50;
export const EARLY_ADOPTER_BONUS_CENTS = 500; // $5.00 USD

export const EARLY_ADOPTER_PROMO_STARTS_AT = new Date(
  process.env.EARLY_ADOPTER_PROMO_STARTS_AT ?? "2026-05-27T00:00:00.000Z",
);

export type EarlyAdopterBonusKind = "listingApproved" | "firstSale";

export type PromoPayoutResult =
  | { status: "paid"; kind: EarlyAdopterBonusKind }
  | { status: "eligible_pending_connect"; kind: EarlyAdopterBonusKind }
  | { status: "already_paid"; kind: EarlyAdopterBonusKind }
  | { status: "ineligible"; reason: string };

type UserLean = User & { _id: mongoose.Types.ObjectId | string };

type GrantLean = EarlyAdopterGrantDoc & {
  _id: mongoose.Types.ObjectId;
};

function userOid(userId: string): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId(userId);
}

export function hasEarlyAdopterGrant(
  grant: Pick<EarlyAdopterGrantDoc, "userId"> | null | undefined,
): boolean {
  return grant != null;
}

function promoAccountEligible(user: UserLean): boolean {
  return (
    user.emailVerified === true &&
    user.accountStanding === AccountStatus.GOOD
  );
}

async function loadGrant(userId: string): Promise<GrantLean | null> {
  if (!mongoose.isValidObjectId(userId)) return null;
  return EarlyAdopterGrant.findOne({ userId: userOid(userId) }).lean() as Promise<GrantLean | null>;
}

async function loadUser(userId: string): Promise<UserLean | null> {
  if (!mongoose.isValidObjectId(userId)) return null;
  return UserModel.findById(userId).lean() as Promise<UserLean | null>;
}

/** Atomically assign one of the first 50 early-adopter slots at signup. */
export async function tryAssignEarlyAdopterOnSignup(
  userId: string,
): Promise<{ assigned: boolean; slot?: number }> {
  if (!mongoose.isValidObjectId(userId)) {
    return { assigned: false };
  }

  if (Date.now() < EARLY_ADOPTER_PROMO_STARTS_AT.getTime()) {
    return { assigned: false };
  }

  const existing = await loadGrant(userId);
  if (existing) {
    return { assigned: true, slot: existing.slot };
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const filled = await EarlyAdopterGrant.countDocuments({}, { session });
    if (filled >= EARLY_ADOPTER_CAP) {
      await session.abortTransaction();
      return { assigned: false };
    }

    const slot = filled + 1;
    await EarlyAdopterGrant.create(
      [{ userId: userOid(userId), slot, assignedAt: new Date() }],
      { session },
    );

    await session.commitTransaction();
    return { assigned: true, slot };
  } catch (err) {
    await session.abortTransaction();

    const raced = await loadGrant(userId);
    if (raced) {
      return { assigned: true, slot: raced.slot };
    }

    throw err;
  } finally {
    session.endSession();
  }
}

export async function isFirstListingApprovalForSeller(
  sellerId: string,
  approvedListingId: string,
): Promise<boolean> {
  const priorApprovedCount = await Listing.countDocuments({
    sellerId: userOid(sellerId),
    _id: { $ne: userOid(approvedListingId) },
    status: { $in: ["live", "reserved", "sold"] },
  });

  return priorApprovedCount === 0;
}

export async function isListingApprovedBonusEligible(
  grant: GrantLean,
  sellerId: string,
  approvedListingId: string,
): Promise<boolean> {
  if (grant.listingApprovedBonusPaid) return false;
  return isFirstListingApprovalForSeller(sellerId, approvedListingId);
}

export async function isFirstSaleBonusEligible(grant: GrantLean): Promise<boolean> {
  if (grant.firstSaleBonusPaid) return false;

  const completedSaleCount = await ListingExchange.countDocuments({
    sellerId: grant.userId,
    buyerConfirmedAt: { $ne: null },
    paymentStatus: { $in: ["succeeded", "captured"] },
    $expr: { $ne: ["$buyerId", "$sellerId"] },
  });

  return completedSaleCount >= 1;
}

async function payEarlyAdopterBonus(
  user: UserLean,
  grant: GrantLean,
  kind: EarlyAdopterBonusKind,
): Promise<PromoPayoutResult> {
  const paidField =
    kind === "listingApproved" ? "listingApprovedBonusPaid" : "firstSaleBonusPaid";
  const paidAtField =
    kind === "listingApproved"
      ? "listingApprovedBonusPaidAt"
      : "firstSaleBonusPaidAt";

  if (kind === "listingApproved" ? grant.listingApprovedBonusPaid : grant.firstSaleBonusPaid) {
    return { status: "already_paid", kind };
  }

  const connectId = user.stripeConnectAccountId?.trim();
  if (!connectId) {
    return { status: "eligible_pending_connect", kind };
  }

  const claimed = await EarlyAdopterGrant.findOneAndUpdate(
    {
      _id: grant._id,
      userId: grant.userId,
      [paidField]: { $ne: true },
    },
    { $set: { [paidField]: true, [paidAtField]: new Date() } },
  );

  if (!claimed) {
    return { status: "already_paid", kind };
  }

  try {
    await stripe.transfers.create({
      amount: EARLY_ADOPTER_BONUS_CENTS,
      currency: "usd",
      destination: connectId,
      description:
        kind === "listingApproved"
          ? "Early adopter bonus: first listing approved"
          : "Early adopter bonus: first completed sale",
    });
    return { status: "paid", kind };
  } catch (err) {
    await EarlyAdopterGrant.findByIdAndUpdate(grant._id, {
      $set: { [paidField]: false, [paidAtField]: null },
    });
    throw err;
  }
}

async function runPromoForUser(
  userId: string,
  kind: EarlyAdopterBonusKind,
  milestoneCheck: (grant: GrantLean, user: UserLean) => Promise<boolean>,
): Promise<PromoPayoutResult> {
  const [user, grant] = await Promise.all([loadUser(userId), loadGrant(userId)]);

  if (!user) {
    return { status: "ineligible", reason: "User not found." };
  }
  if (!grant) {
    return { status: "ineligible", reason: "Not an early adopter." };
  }
  if (!promoAccountEligible(user)) {
    return { status: "ineligible", reason: "Account not eligible for promo payouts." };
  }

  const eligible = await milestoneCheck(grant, user);
  if (!eligible) {
    return {
      status: "ineligible",
      reason:
        kind === "listingApproved"
          ? "Listing approval bonus not eligible."
          : "First sale bonus not eligible.",
    };
  }

  return payEarlyAdopterBonus(user, grant, kind);
}

export async function onAdminApprovedListing(
  sellerId: string,
  listingId: string,
): Promise<PromoPayoutResult> {
  return runPromoForUser(sellerId, "listingApproved", (grant) =>
    isListingApprovedBonusEligible(grant, sellerId, listingId),
  );
}

export async function onBuyerConfirmedExchange(
  sellerId: string,
): Promise<PromoPayoutResult> {
  return runPromoForUser(sellerId, "firstSale", (grant) =>
    isFirstSaleBonusEligible(grant),
  );
}

export async function retryPendingEarlyAdopterBonuses(
  userId: string,
): Promise<PromoPayoutResult[]> {
  const [user, grant] = await Promise.all([loadUser(userId), loadGrant(userId)]);
  if (!user || !grant || !promoAccountEligible(user)) {
    return [];
  }

  const results: PromoPayoutResult[] = [];

  if (!grant.listingApprovedBonusPaid) {
    const hasApprovedListing = await Listing.exists({
      sellerId: userOid(userId),
      status: { $in: ["live", "reserved", "sold"] },
    });
    if (hasApprovedListing) {
      results.push(await payEarlyAdopterBonus(user, grant, "listingApproved"));
    }
  }

  const refreshedGrant = await loadGrant(userId);
  const refreshedUser = await loadUser(userId);
  if (
    refreshedGrant &&
    refreshedUser &&
    !refreshedGrant.firstSaleBonusPaid &&
    (await isFirstSaleBonusEligible(refreshedGrant))
  ) {
    results.push(
      await payEarlyAdopterBonus(refreshedUser, refreshedGrant, "firstSale"),
    );
  }

  return results;
}
