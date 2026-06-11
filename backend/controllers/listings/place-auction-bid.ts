import type { Request, Response } from "express";
import mongoose from "mongoose";

import { io } from "../../app";
import { SocketEvents } from "../../lib/socket-events";
import Listing from "../../models/listing";
import {
  attachAuctionSummary,
  computeAuctionCurrentPriceCents,
  minimumNextBidCents,
} from "../../lib/listing-auction-summary";
/**
 * Records a no-charge auction bid. Bids must be whole dollars and at least
 * $1 above the current price (max of starting price and highest bid).
 */
export async function placeAuctionBid(req: Request, res: Response) {
  try {
    const bidderId = req.user?.userId;
    if (!bidderId) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    const rawId = req.params.id;
    const listingId = Array.isArray(rawId) ? String(rawId[0] ?? "") : String(rawId ?? "");
    if (!listingId || !mongoose.isValidObjectId(listingId)) {
      return void res.status(400).json({ message: "Invalid listing id" });
    }

    const amountRaw = (req.body as { amount?: unknown })?.amount;
    const amount = typeof amountRaw === "number" ? amountRaw : Number(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) {
      return void res.status(400).json({ message: "A positive bid amount is required." });
    }

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return void res.status(404).json({ message: "Listing not found" });
    }

    if (listing.saleType !== "auction") {
      return void res.status(400).json({ message: "This listing is not an auction." });
    }

    if (listing.status !== "live") {
      return void res.status(400).json({ message: "Bids can only be placed on live auctions." });
    }

    const end = listing.auctionEndDate ? new Date(listing.auctionEndDate) : null;
    if (end && !Number.isNaN(end.getTime()) && end.getTime() < Date.now()) {
      return void res.status(400).json({ message: "This auction has ended." });
    }

    const bids = listing.auctionBids ?? [];
    const currentCents = computeAuctionCurrentPriceCents(
      Number(listing.startingPrice ?? 0),
      bids,
    );
    const minNextCents = minimumNextBidCents(currentCents);
    const bidCents = Math.round(amount * 100);
    if (bidCents % 100 !== 0) {
      return void res.status(400).json({
        message: "Bids must be whole dollar amounts (no cents).",
      });
    }
    if (bidCents < minNextCents) {
      return void res.status(400).json({
        message: `Minimum bid is $${(minNextCents / 100).toFixed(0)} (whole dollars, at least $1 above the current price of $${(currentCents / 100).toFixed(2)}).`,
      });
    }

    listing.auctionFollowers = [...(listing.auctionFollowers ?? []), bidderId];

    listing.auctionBids = [
      ...bids,
      {
        bidderId: new mongoose.Types.ObjectId(bidderId),
        amount: bidCents / 100,
        createdAt: new Date(),
        bidStatus: "pending",
      },
    ];
    listing.openBidCount = (listing.openBidCount ?? 0) + 1;
    await listing.save();

    const sellerId = String(listing.sellerId);
    const listingOid = String(listing._id);
    const appName = String(listing.appName ?? "Listing");
    const bidPayload = {
      listingId: listingOid,
      appName,
      amount: bidCents / 100,
    };
    if (sellerId && sellerId !== bidderId) {
      io.to(sellerId).emit(SocketEvents.AUCTION_BID_PLACED, {
        message: `New bid on ${appName}`,
        ...bidPayload,
      });
    }
    io.to(bidderId).emit(SocketEvents.AUCTION_BID_PLACED, {
      message: "Your bid was recorded.",
      ...bidPayload,
    });

    const payload = attachAuctionSummary(listing.toObject());
    return void res.status(201).json(payload);
  } catch (err) {
    console.log("placeAuctionBid error:", err);
    return void res.status(500).json({ message: "Failed to place bid" });
  }
}
