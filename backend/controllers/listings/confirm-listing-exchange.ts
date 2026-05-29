import type { Request, Response } from "express";
import mongoose from "mongoose";

import ListingExchange from "../../models/exchange";
import Listing from "../../models/listing";
import Transaction from "../../models/transactions";
import { LISTING_PURCHASE_BILLING_REASONS } from "../../lib/listing-purchase-billing";

export async function confirmListingExchange(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    const listingId = Array.isArray(req.params.listingId)
      ? String(req.params.listingId[0] ?? "")
      : String(req.params.listingId ?? "");
    if (!mongoose.isValidObjectId(listingId)) {
      return void res.status(400).json({ message: "Invalid listing id" });
    }

    const listing = await Listing.findById(listingId).select("status buyerId");
    if (!listing || listing.status !== "sold") {
      return void res.status(404).json({ message: "Listing not found or not sold." });
    }

    const buyerId = listing.buyerId ? String(listing.buyerId) : "";
    if (userId !== buyerId) {
      return void res.status(403).json({ message: "Only the buyer can confirm receipt." });
    }

    const ex = await ListingExchange.findOne({ listingId: listing._id });
    if (!ex) {
      return void res.status(404).json({ message: "Exchange record not found." });
    }

    const tx = (await Transaction.findOne({
      ListingId: listing._id,
      billingReason: { $in: [...LISTING_PURCHASE_BILLING_REASONS] },
    })
      .sort({ createdAt: -1 })
      .lean()) as { paymentStatus?: string } | null;

    const exchangeCaptured =
      ex.sellerCapturedPayment === true ||
      ex.paymentStatus === "succeeded" ||
      ex.paymentStatus === "captured";
    const txSucceeded = tx?.paymentStatus === "succeeded";

    if (!exchangeCaptured && !txSucceeded) {
      return void res.status(409).json({
        message:
          "The seller must capture payment before you can confirm receipt. Optional handover files do not affect this step.",
      });
    }

    if (ex.buyerConfirmedAt) {
      return void res.status(200).json({
        buyerConfirmedAt: ex.buyerConfirmedAt.toISOString(),
      });
    }

    ex.buyerConfirmedAt = new Date();
    await ex.save();

    return void res.status(200).json({
      buyerConfirmedAt: ex.buyerConfirmedAt.toISOString(),
    });
  } catch (err) {
    console.log("confirmListingExchange error:", err);
    return void res.status(500).json({ message: "Failed to confirm exchange" });
  }
}
