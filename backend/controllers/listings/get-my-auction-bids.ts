import type { Request, Response } from "express";
import mongoose from "mongoose";

import {
  attachAuctionSummary,
  effectiveBidStatus,
  type AuctionBidLean,
} from "../../lib/listing-auction-summary";
import Listing from "../../models/listing";

/**
 * Auction listings where the authenticated user has placed at least one bid.
 * Returns per-listing auction summary (market pricing) plus only that user's bid rows.
 */
export async function getMyAuctionBids(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    const oid = new mongoose.Types.ObjectId(userId);

    const listings = await Listing.find({
      saleType: "auction",
      "auctionBids.bidderId": oid,
    })
      .sort({ updatedAt: -1 })
      .lean();

    const rows = listings.map((listing) => {
      const plain = listing as Record<string, unknown>;
      const bids = (listing.auctionBids ?? []) as AuctionBidLean[];
      const myBids = bids
        .filter((b) => String(b.bidderId) === userId)
        .map((b) => ({
          _id: b._id ? String(b._id) : "",
          amount: Number(b.amount) || 0,
          createdAt: b.createdAt,
          bidStatus: effectiveBidStatus(b),
        }))
        .sort((a, b) => {
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tb - ta;
        });

      const summarized = attachAuctionSummary({
        ...plain,
        auctionBids: bids,
      });

      const photos = Array.isArray(listing.photos) ? listing.photos.map(String) : [];
      const coverIndex = Number(listing.coverIndex ?? 0) || 0;

      return {
        listing: {
          _id: String(listing._id),
          slug: String(listing.slug ?? ""),
          appName: String(listing.appName ?? ""),
          status: String(listing.status ?? ""),
          photos,
          coverIndex,
          auctionEndDate: listing.auctionEndDate ?? null,
          startingPrice: Number(listing.startingPrice ?? 0),
          auctionCurrentPrice: summarized.auctionCurrentPrice,
          auctionMinimumNextBid: summarized.auctionMinimumNextBid,
          auctionHighBidAmount: summarized.auctionHighBidAmount,
        },
        myBids,
      };
    });

    return void res.status(200).json(rows);
  } catch (err) {
    console.error("getMyAuctionBids error:", err);
    return void res.status(500).json({ message: "Failed to load your bids" });
  }
}
