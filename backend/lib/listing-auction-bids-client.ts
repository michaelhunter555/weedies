import type { Types } from "mongoose";

import type { AuctionBidLean, AuctionBidStatus } from "./listing-auction-summary";

type BidSub = AuctionBidLean & { _id?: Types.ObjectId };

/**
 * Serializes Mongo `auctionBids` subdocuments for JSON - same field name as the
 * DB (`auctionBids`). ObjectIds become strings. Used on seller-only responses.
 */
export function auctionBidsClientJson(
  auctionBids: BidSub[] | undefined,
): {
  _id: string;
  bidderId: string;
  amount: number;
  createdAt: Date | undefined;
  bidStatus: AuctionBidStatus;
}[] {
  if (!auctionBids?.length) return [];
  return auctionBids.map((b) => ({
    _id: b._id ? String(b._id) : "",
    bidderId: b.bidderId ? String(b.bidderId) : "",
    amount: Number(b.amount) || 0,
    createdAt: b.createdAt,
    bidStatus: (b.bidStatus ?? "pending") as AuctionBidStatus,
  }));
}
