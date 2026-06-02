import type { Listing } from "../../types";
import { mongoIdString } from "@/utils/mongo-id";

function listingBuyerId(listing: Listing | undefined): string | null {
  return mongoIdString(listing?.buyerId);
}

/** Auction ended with a winner who has not completed payment yet. */
export function listingHasAuctionWinnerOutcome(listing: Listing | undefined): boolean {
  if (!listing || listing.saleType !== "auction") return false;
  if (!listingBuyerId(listing)) return false;
  const finalized = (listing as { auctionFinalizedAt?: string | Date }).auctionFinalizedAt;
  if (finalized) return true;
  const win = Number(listing.auctionWinningAmount);
  return Number.isFinite(win) && win > 0;
}

/** Logged-in user is the high bidder who still owes payment (Stripe or Escrow). */
export function isAuctionWinnerCheckoutForUser(
  listing: Listing | undefined,
  userId: string | null | undefined,
): boolean {
  if (!listing || !userId || listing.status === "sold") return false;
  if (!listingHasAuctionWinnerOutcome(listing)) return false;
  if (listingBuyerId(listing) !== userId) return false;
  return listing.status === "reserved" || listing.status === "live";
}
