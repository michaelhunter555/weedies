import type { ListingStatus } from "../types";

/** Listings that ended without a sale (auction no winner, etc.). */
export function sellerListingExpiredQuery(): Record<string, unknown> {
  return {
    $or: [
      { status: "expired" },
      {
        status: "paused",
        auctionFinalizedAt: { $exists: true, $ne: null },
        $or: [{ buyerId: null }, { buyerId: { $exists: false } }],
      },
    ],
  };
}

export function sellerListingActiveQuery(): Record<string, unknown> {
  return {
    status: { $nin: ["sold", "removed", "expired"] as ListingStatus[] },
    $nor: [sellerListingExpiredQuery()],
  };
}

export function isListingRelistEligible(listing: {
  status?: string;
  auctionFinalizedAt?: Date | null;
  buyerId?: unknown;
  soldAt?: Date | null;
}): boolean {
  if (listing.status === "sold" || listing.status === "removed") return false;
  if (listing.buyerId) return false;
  if (listing.status === "expired") return true;
  if (
    listing.status === "paused" &&
    listing.auctionFinalizedAt != null
  ) {
    return true;
  }
  return false;
}
