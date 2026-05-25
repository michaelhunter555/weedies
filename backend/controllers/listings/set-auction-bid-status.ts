import type { Request, Response } from "express";
import mongoose from "mongoose";

import { io } from "../../app";
import { SocketEvents } from "../../lib/socket-events";
import Listing from "../../models/listing";
import {
  attachAuctionSummary,
  countPendingAuctionBids,
} from "../../lib/listing-auction-summary";
import { auctionBidsClientJson } from "../../lib/listing-auction-bids-client";

/**
 * Seller only: accept or reject a **pending** auction bid on their listing.
 */
export async function setAuctionBidStatus(req: Request, res: Response) {
  try {
    const sellerId = req.user?.userId;
    if (!sellerId) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    const listingId = Array.isArray(req.params.id)
      ? String(req.params.id[0] ?? "")
      : String(req.params.id ?? "");
    const bidId = Array.isArray(req.params.bidId)
      ? String(req.params.bidId[0] ?? "")
      : String(req.params.bidId ?? "");
    if (!mongoose.isValidObjectId(listingId) || !mongoose.isValidObjectId(bidId)) {
      return void res.status(400).json({ message: "Invalid id" });
    }

    const nextStatus = (req.body as { status?: unknown })?.status;
    if (nextStatus !== "accepted" && nextStatus !== "rejected") {
      return void res
        .status(400)
        .json({ message: "status must be \"accepted\" or \"rejected\"." });
    }

    const listing = await Listing.findOne({ _id: listingId, sellerId });
    if (!listing) {
      return void res.status(404).json({ message: "Listing not found" });
    }
    if (listing.saleType !== "auction") {
      return void res.status(400).json({ message: "Not an auction listing." });
    }

    const sub = listing.auctionBids?.id(new mongoose.Types.ObjectId(bidId));
    if (!sub) {
      return void res.status(404).json({ message: "Bid not found" });
    }

    const bidderRaw = (sub as { bidderId?: unknown }).bidderId;
    const bidderId = bidderRaw != null ? String(bidderRaw) : "";

    const cur = (sub as { bidStatus?: string }).bidStatus ?? "pending";
    if (cur !== "pending") {
      return void res.status(409).json({ message: "This bid was already resolved." });
    }

    (sub as { bidStatus: string }).bidStatus = nextStatus;
    await listing.save();

    const listingOid = String(listing._id);
    const appName = String(listing.appName ?? "Listing");
    const resolvedPayload = {
      listingId: listingOid,
      bidId,
      status: nextStatus,
      appName,
    };
    if (bidderId) {
      io.to(bidderId).emit(SocketEvents.AUCTION_BID_RESOLVED, {
        message:
          nextStatus === "accepted"
            ? `Your bid on "${appName}" was accepted!`
            : `Your bid on "${appName}" was not accepted.`,
        ...resolvedPayload,
      });
    }
    io.to(sellerId).emit(SocketEvents.AUCTION_BID_RESOLVED, {
      message:
        nextStatus === "accepted"
          ? `You accepted a bid on "${appName}".`
          : `You declined a bid on "${appName}".`,
      ...resolvedPayload,
    });

    const plain = listing.toObject() as Record<string, unknown>;
    const summarized = attachAuctionSummary(plain);
    return void res.status(200).json({
      ...summarized,
      auctionPendingBidCount: countPendingAuctionBids(listing.auctionBids),
      auctionBids: auctionBidsClientJson(listing.auctionBids),
    });
  } catch (err) {
    console.log("setAuctionBidStatus error:", err);
    return void res.status(500).json({ message: "Failed to update bid" });
  }
}
