import type { Listing } from "../models/listing";

type AuctionWinnerListing = Pick<
  Listing,
  | "saleType"
  | "status"
  | "buyerId"
  | "auctionWinningAmount"
  | "auctionFinalizedAt"
>;

/** Auction ended with a winning bidder who still owes payment (not sold yet). */
export function isAuctionWithWinnerOutcome(
  listing: AuctionWinnerListing | null | undefined,
): boolean {
  if (!listing || listing.saleType !== "auction") return false;
  if (!listing.buyerId) return false;
  if (listing.auctionFinalizedAt) return true;
  const win = Number(listing.auctionWinningAmount);
  return Number.isFinite(win) && win > 0;
}

/** Winner is reserved for checkout — must not be released to live on escrow cancel. */
export function isAuctionWinnerAwaitingPayment(
  listing: AuctionWinnerListing | null | undefined,
): boolean {
  if (!isAuctionWithWinnerOutcome(listing)) return false;
  if (listing!.status === "sold") return false;
  return listing!.status === "reserved";
}

export function buyerIsAuctionWinner(
  listing: AuctionWinnerListing,
  buyerUserId: string,
): boolean {
  return (
    isAuctionWinnerAwaitingPayment(listing) &&
    String(listing.buyerId) === buyerUserId
  );
}
