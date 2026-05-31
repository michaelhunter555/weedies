import type { AuctionBidLean } from "./listing-auction-summary";
import { bidsEligibleForPricing, effectiveBidStatus } from "./listing-auction-summary";

export type AuctionWinningBid = AuctionBidLean & {
  _id?: { toString(): string };
};

/**
 * Highest pricing-eligible bid at auction end. Ties go to the earlier bid.
 */
export function pickAuctionWinningBid(
  bids: AuctionBidLean[] | undefined,
): AuctionWinningBid | null {
  const eligible = bidsEligibleForPricing(bids);
  if (!eligible.length) return null;

  let best = eligible[0];
  for (let i = 1; i < eligible.length; i++) {
    const bid = eligible[i];
    const bestAmount = Number(best.amount) || 0;
    const bidAmount = Number(bid.amount) || 0;
    if (bidAmount > bestAmount) {
      best = bid;
      continue;
    }
    if (bidAmount < bestAmount) continue;
    const bestAt = best.createdAt ? new Date(best.createdAt).getTime() : 0;
    const bidAt = bid.createdAt ? new Date(bid.createdAt).getTime() : 0;
    if (bidAt < bestAt) best = bid;
  }
  return best;
}

export function markWinningBidAccepted(
  bids: AuctionBidLean[] | undefined,
  winner: AuctionWinningBid,
): void {
  if (!bids?.length || !winner) return;
  const winnerId = winner._id ? String(winner._id) : "";
  const winnerBidder = winner.bidderId ? String(winner.bidderId) : "";
  const winnerAmount = Number(winner.amount) || 0;

  for (const b of bids) {
    const id = b._id ? String(b._id) : "";
    const sameSub =
      (winnerId && id === winnerId) ||
      (!winnerId &&
        String(b.bidderId ?? "") === winnerBidder &&
        Number(b.amount) === winnerAmount);
    if (sameSub && effectiveBidStatus(b) !== "rejected") {
      b.bidStatus = "accepted";
    }
  }
}
