import type { Types } from "mongoose";
import Transaction from "../models/transactions";

/** Buyer-side financial activity that blocks the seller from editing listing copy. */
const BUYER_BLOCKING_REASONS = ["Listing purchase", "Auction bid"];

const EDITABLE_STATUSES = new Set([
  "draft",
  "pending_review",
  "live",
  "paused",
  "rejected",
]);

export function isListingStatusSellerEditable(
  status: string | undefined,
): boolean {
  return Boolean(status && EDITABLE_STATUSES.has(status));
}

export async function hasBuyerBlockingTransactions(
  listingId: Types.ObjectId | string,
): Promise<boolean> {
  const n = await Transaction.countDocuments({
    ListingId: listingId,
    billingReason: { $in: BUYER_BLOCKING_REASONS },
    paymentStatus: { $in: ["succeeded", "pending"] },
  });
  return n > 0;
}

/** One aggregation for dashboard: which listing ids have blocking buyer activity. */
export async function mapListingIdsToBuyerBlocked(
  listingIds: Types.ObjectId[],
): Promise<Map<string, boolean>> {
  const out = new Map<string, boolean>();
  for (const id of listingIds) {
    out.set(String(id), false);
  }
  if (!listingIds.length) return out;

  const rows = await Transaction.aggregate<{ _id: Types.ObjectId }>([
    {
      $match: {
        ListingId: { $in: listingIds },
        billingReason: { $in: BUYER_BLOCKING_REASONS },
        paymentStatus: { $in: ["succeeded", "pending"] },
      },
    },
    { $group: { _id: "$ListingId" } },
  ]);

  for (const row of rows) {
    out.set(String(row._id), true);
  }
  return out;
}

export type SellerEditBlockReason =
  | "not_found"
  | "not_owner"
  | "status_not_editable"
  | "has_buyer_activity"
  | "has_open_bids";

export function sellerCanEditListingFields(args: {
  status?: string;
  openBidCount?: number;
  hasBuyerBlockingTx: boolean;
}): { ok: true } | { ok: false; reason: SellerEditBlockReason } {
  if (!isListingStatusSellerEditable(args.status)) {
    return { ok: false, reason: "status_not_editable" };
  }
  if ((args.openBidCount ?? 0) > 0) {
    return { ok: false, reason: "has_open_bids" };
  }
  if (args.hasBuyerBlockingTx) {
    return { ok: false, reason: "has_buyer_activity" };
  }
  return { ok: true };
}
