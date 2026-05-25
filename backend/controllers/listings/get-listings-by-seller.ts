import type { Request, Response } from "express";
import mongoose from "mongoose";
import Listing from "../../models/listing";
import { attachAuctionSummary, countPendingAuctionBids } from "../../lib/listing-auction-summary";
import {
  mapListingIdsToBuyerBlocked,
  sellerCanEditListingFields,
} from "../../lib/listing-seller-edit";
import { auctionBidsClientJson } from "../../lib/listing-auction-bids-client";
import { enrichPendingPrivateListingRequests } from "../../lib/enrich-private-listing-requests";

/**
 * Returns all listings owned by the authenticated seller (any status).
 * Each item includes `sellerCanEdit` when the seller may still change listing
 * fields (no buyer purchases/bids, `openBidCount` is 0, editable status).
 */
export async function getListingsBySeller(req: Request, res: Response) {
  try {
    const sellerId = req.user?.userId;
    if (!sellerId) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    const listings = await Listing.find({ sellerId }).sort({ updatedAt: -1 });
    const ids = listings.map((l) => l._id as mongoose.Types.ObjectId);
    const blockedMap = await mapListingIdsToBuyerBlocked(ids);

    const payload = await Promise.all(
      listings.map(async (l) => {
        const o = l.toObject() as Record<string, unknown>;
        const hasBuyerBlockingTx = blockedMap.get(String(l._id)) ?? false;
        const gate = sellerCanEditListingFields({
          status: l.status,
          openBidCount: l.openBidCount,
          hasBuyerBlockingTx,
        });
        const pendingPrivateListingRequests = await enrichPendingPrivateListingRequests(
          l.pendingPrivateListingRequests as Parameters<
            typeof enrichPendingPrivateListingRequests
          >[0],
        );
        const base = {
          ...o,
          sellerCanEdit: gate.ok,
          pendingPrivateListingRequests,
        };
        if (l.saleType === "auction") {
          const summarized = attachAuctionSummary(base);
          return {
            ...summarized,
            auctionPendingBidCount: countPendingAuctionBids(l.auctionBids),
            auctionBids: auctionBidsClientJson(l.auctionBids),
          };
        }
        return base;
      }),
    );

    return void res.status(200).json(payload);
  } catch (err) {
    console.log("getListingsBySeller error:", err);
    return void res.status(500).json({ message: "Failed to fetch seller listings" });
  }
}
