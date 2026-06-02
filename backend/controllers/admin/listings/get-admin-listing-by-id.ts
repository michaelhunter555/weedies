import type { Request, Response } from "express";
import mongoose from "mongoose";

import {
  attachAuctionSummary,
  countPendingAuctionBids,
  type AuctionBidLean,
} from "../../../lib/listing-auction-summary";
import { auctionBidsClientJson } from "../../../lib/listing-auction-bids-client";
import { sanitizeListingDescriptionFields } from "../../../lib/listing-description";
import type { Listing } from "../../../models/listing";
import ListingModel from "../../../models/listing";

/**
 * GET /api/admin/listings/:listingId
 * Full listing payload for admin review (no buyer privacy masking).
 */
export async function getAdminListingById(req: Request, res: Response) {
  try {
    const raw = req.params.listingId;
    const listingId = Array.isArray(raw) ? raw[0] : raw;
    if (!listingId || !mongoose.isValidObjectId(listingId)) {
      return void res.status(400).json({ message: "Invalid listing id" });
    }

    const listing = (await ListingModel.findById(listingId)
      .populate(
        "sellerId",
        "name email isVerifiedCreator hasVerifiedAnalytics sellerRating totalSellerReviews",
      )
      .lean()) as (Listing & { _id: unknown }) | null;

    if (!listing) {
      return void res.status(404).json({ message: "Listing not found" });
    }

    const base = { ...listing } as Record<string, unknown>;
    if (listing.saleType === "auction") {
      const summarized = attachAuctionSummary({
        ...base,
        startingPrice: listing.startingPrice,
        auctionBids: (listing.auctionBids ?? []) as AuctionBidLean[],
      });
      return void res.json({
        ok: true,
        listing: sanitizeListingDescriptionFields({
          ...summarized,
          auctionBids: auctionBidsClientJson(listing.auctionBids),
          auctionPendingBidCount: countPendingAuctionBids(listing.auctionBids),
        } as Record<string, unknown>),
      });
    }

    return void res.json({
      ok: true,
      listing: sanitizeListingDescriptionFields(base),
    });
  } catch (err) {
    console.error("getAdminListingById:", err);
    return void res.status(500).json({ message: "Failed to load listing" });
  }
}
