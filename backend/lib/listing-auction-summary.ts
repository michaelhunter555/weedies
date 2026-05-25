import type { Types } from "mongoose";

export type AuctionBidStatus = "pending" | "accepted" | "rejected";

export type AuctionBidLean = {
  _id?: Types.ObjectId;
  bidderId?: Types.ObjectId;
  amount: number;
  createdAt?: Date;
  bidStatus?: AuctionBidStatus;
};

export function effectiveBidStatus(b: AuctionBidLean): AuctionBidStatus {
  return b.bidStatus ?? "pending";
}

/** Bids that still affect pricing (rejected bids are ignored). */
export function bidsEligibleForPricing(
  bids: AuctionBidLean[] | undefined,
): AuctionBidLean[] {
  if (!bids?.length) return [];
  return bids.filter((b) => effectiveBidStatus(b) !== "rejected");
}

/** Highest bid among pricing-eligible bids, or null. */
export function computeAuctionHighBid(
  bids: AuctionBidLean[] | undefined,
): number | null {
  const eligible = bidsEligibleForPricing(bids);
  if (!eligible.length) return null;
  return Math.max(...eligible.map((b) => Number(b.amount) || 0));
}

/**
 * "Current price" shown to buyers = max(starting price, highest eligible bid).
 * Next bid must be strictly greater than this by at least $1 in whole dollars
 * (see `minimumNextBidCents`).
 */
export function computeAuctionCurrentPriceCents(
  startingPrice: number,
  bids: AuctionBidLean[] | undefined,
): number {
  const startCents = Math.round(Number(startingPrice) * 100);
  const high = computeAuctionHighBid(bids);
  if (high == null) return Math.max(0, startCents);
  return Math.max(startCents, Math.round(high * 100));
}

/**
 * Smallest **whole-dollar** bid allowed: strictly above the current price
 * and at least **$1** higher than the current price (no penny bids like 100.01).
 */
export function minimumNextBidCents(currentPriceCents: number): number {
  return Math.ceil((currentPriceCents + 100) / 100) * 100;
}

export function countPendingAuctionBids(bids: AuctionBidLean[] | undefined): number {
  if (!bids?.length) return 0;
  return bids.filter((b) => effectiveBidStatus(b) === "pending").length;
}

/** Public JSON shape: accepted bids only, no bidder ids. */
export type PublicAcceptedAuctionBid = {
  _id: string;
  amount: number;
  createdAt?: Date;
};

/**
 * Accepted bids safe to show on public listing pages (amount + time, oldest first).
 */
export function publicAcceptedAuctionBidHistory(
  bids: AuctionBidLean[] | undefined,
): PublicAcceptedAuctionBid[] {
  if (!bids?.length) return [];
  return bids
    .filter((b) => effectiveBidStatus(b) === "accepted")
    .map((b) => ({
      _id: b._id ? String(b._id) : "",
      amount: Number(b.amount) || 0,
      createdAt: b.createdAt,
    }))
    .sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return ta - tb;
    });
}

export function attachAuctionSummary<T extends Record<string, unknown>>(
  doc: T & {
    startingPrice?: number;
    auctionBids?: AuctionBidLean[];
  },
): T & {
  auctionCurrentPrice: number;
  auctionMinimumNextBid: number;
  auctionBidCount: number;
  auctionHighBidAmount: number | null;
  auctionAcceptedBidHistory: PublicAcceptedAuctionBid[];
} {
  const bids = doc.auctionBids ?? [];
  const eligible = bidsEligibleForPricing(bids);
  const high = computeAuctionHighBid(bids);
  const currentCents = computeAuctionCurrentPriceCents(
    Number(doc.startingPrice ?? 0),
    bids,
  );
  const minNextCents = minimumNextBidCents(currentCents);
  const acceptedHistory = publicAcceptedAuctionBidHistory(bids);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { auctionBids: _strip, ...rest } = doc;
  return {
    ...(rest as T),
    auctionCurrentPrice: currentCents / 100,
    auctionMinimumNextBid: minNextCents / 100,
    auctionBidCount: eligible.length,
    auctionHighBidAmount: high,
    auctionAcceptedBidHistory: acceptedHistory,
  };
}
