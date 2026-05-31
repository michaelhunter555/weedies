import type { Listing } from "../models/listing";
import { computeAuctionCurrentPriceCents } from "./listing-auction-summary";
import { pickAuctionWinningBid } from "./auction-pick-winner";

/** Winning purchase price in dollars for a reserved / ended auction listing. */
export function listingAuctionPurchasePriceDollars(
  listing: Pick<Listing, "startingPrice" | "auctionBids" | "buyerId"> & {
    auctionWinningAmount?: number;
  },
): number {
  if (
    listing.auctionWinningAmount != null &&
    Number.isFinite(Number(listing.auctionWinningAmount))
  ) {
    return Math.max(0, Number(listing.auctionWinningAmount));
  }

  const buyerId = listing.buyerId ? String(listing.buyerId) : "";
  const winner = pickAuctionWinningBid(listing.auctionBids);
  if (
    winner &&
    buyerId &&
    String(winner.bidderId ?? "") === buyerId &&
    Number(winner.amount) > 0
  ) {
    return Number(winner.amount);
  }

  return computeAuctionCurrentPriceCents(
    Number(listing.startingPrice ?? 0),
    listing.auctionBids,
  ) / 100;
}
