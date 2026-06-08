import mongoose from "mongoose";

import {
  checkPlatformListingUrl,
  checkSocialListingUrl,
  normalizeSocialMediaValue,
  type ListingLinkCheck,
} from "./listing-link-urls";
import { LISTING_PURCHASE_BILLING_REASONS } from "./listing-purchase-billing";
import type { Listing } from "../models/listing";
import Transaction, { type ITransaction } from "../models/transactions";
import stripe from "../utils/stripe";
import type { Platforms, SocialMediaPlatform } from "../types";

export type AdminListingTransactionSnapshot = {
  id: string;
  billingReason: string;
  paymentStatus: string | null;
  paymentType: string | null;
  amountPaidCents: number;
  serviceFeeCents: number;
  stripePaymentIntentId: string | null;
  chargeId: string | null;
  escrowTransactionId: string | null;
  paidOut: boolean;
  hasDispute: boolean;
  createdAt: string | null;
};

export type AdminListingPaymentsSnapshot = {
  listingStatus: string;
  sellerCommittedAt: string | null;
  privateListingFeePaid: boolean;
  listingFeePaymentIntentId: string | null;
  listingFeeStripeStatus: string | null;
  listingFee: AdminListingTransactionSnapshot | null;
  purchase: AdminListingTransactionSnapshot | null;
};

export type AdminListingReviewContext = {
  platformLinks: ListingLinkCheck[];
  socialLinks: ListingLinkCheck[];
  payments: AdminListingPaymentsSnapshot;
};

type TxLean = Pick<
  ITransaction,
  | "billingReason"
  | "paymentStatus"
  | "paymentType"
  | "amountPaid"
  | "serviceFee"
  | "stripePaymentIntentId"
  | "chargeId"
  | "escrowTransactionId"
  | "paidOut"
  | "hasDispute"
> & {
  _id: mongoose.Types.ObjectId;
  createdAt?: Date;
};

function serializeTx(doc: TxLean | null): AdminListingTransactionSnapshot | null {
  if (!doc) return null;
  return {
    id: String(doc._id),
    billingReason: String(doc.billingReason ?? ""),
    paymentStatus: doc.paymentStatus ?? null,
    paymentType: doc.paymentType ?? "stripe",
    amountPaidCents: Number(doc.amountPaid ?? 0),
    serviceFeeCents: Number(doc.serviceFee ?? 0),
    stripePaymentIntentId: doc.stripePaymentIntentId?.trim() || null,
    chargeId: doc.chargeId?.trim() || null,
    escrowTransactionId: doc.escrowTransactionId?.trim() || null,
    paidOut: Boolean(doc.paidOut),
    hasDispute: Boolean(doc.hasDispute),
    createdAt:
      doc.createdAt instanceof Date ? doc.createdAt.toISOString() : null,
  };
}

function urlMapFromListingEntries(
  entries?: { platform?: string; url?: string }[] | null,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of entries ?? []) {
    const platform = String(entry.platform ?? "").trim();
    const url = String(entry.url ?? "").trim();
    if (platform && url) map.set(platform, url);
  }
  return map;
}

export async function buildAdminListingReviewContext(
  listing: Listing & { _id: unknown },
): Promise<AdminListingReviewContext> {
  const listingOid = new mongoose.Types.ObjectId(String(listing._id));

  const platformUrlMap = urlMapFromListingEntries(listing.platformUrls);
  const platformLinks = (listing.platforms ?? []).map((platform) =>
    checkPlatformListingUrl(
      platform as Platforms,
      platformUrlMap.get(platform) ?? null,
    ),
  );

  const socialUrlMap = urlMapFromListingEntries(listing.socialMediaUrls);
  const socialLinks = (listing.socialMedia ?? []).map((raw) => {
    const platform = normalizeSocialMediaValue(String(raw)) as SocialMediaPlatform;
    return checkSocialListingUrl(
      platform,
      socialUrlMap.get(platform) ?? socialUrlMap.get(String(raw)) ?? null,
      false,
    );
  });

  const [listingFeeTx, purchaseTx] = await Promise.all([
    Transaction.findOne({
      ListingId: listingOid,
      billingReason: "Listing fee",
    })
      .sort({ createdAt: -1 })
      .lean() as Promise<TxLean | null>,
    Transaction.findOne({
      ListingId: listingOid,
      billingReason: { $in: [...LISTING_PURCHASE_BILLING_REASONS] },
    })
      .sort({ createdAt: -1 })
      .lean() as Promise<TxLean | null>,
  ]);

  const piId =
    listing.paymentIntentId?.trim() ||
    listingFeeTx?.stripePaymentIntentId?.trim() ||
    null;

  let listingFeeStripeStatus: string | null = null;
  if (piId) {
    try {
      const pi = await stripe.paymentIntents.retrieve(piId);
      listingFeeStripeStatus = pi.status;
    } catch {
      listingFeeStripeStatus = "unavailable";
    }
  }

  return {
    platformLinks,
    socialLinks,
    payments: {
      listingStatus: String(listing.status ?? ""),
      sellerCommittedAt:
        listing.sellerCommittedAt instanceof Date
          ? listing.sellerCommittedAt.toISOString()
          : null,
      privateListingFeePaid: Boolean(listing.privateListingFeePaid),
      listingFeePaymentIntentId: piId,
      listingFeeStripeStatus,
      listingFee: serializeTx(listingFeeTx),
      purchase: serializeTx(purchaseTx),
    },
  };
}
