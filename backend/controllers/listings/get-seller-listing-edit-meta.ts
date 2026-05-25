import type { Request, Response } from "express";
import mongoose from "mongoose";
import Listing from "../../models/listing";
import {
  hasBuyerBlockingTransactions,
  sellerCanEditListingFields,
} from "../../lib/listing-seller-edit";

/**
 * Authenticated seller: whether they may edit listing fields (copy, photos, etc.).
 * Blocked when the listing has buyer purchases/bids in Stripe-backed transactions
 * or when `openBidCount` > 0 (reserved for future bid APIs).
 */
export async function getSellerListingEditMeta(req: Request, res: Response) {
  try {
    const sellerId = req.user?.userId;
    if (!sellerId) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    const raw = req.query.listingId;
    const listingId =
      typeof raw === "string"
        ? raw.trim()
        : Array.isArray(raw)
          ? String(raw[0] ?? "").trim()
          : "";

    if (!listingId || !mongoose.isValidObjectId(listingId)) {
      return void res.status(400).json({ message: "Valid listingId query required." });
    }

    const listing = await Listing.findOne({
      _id: listingId,
      sellerId,
    });

    if (!listing) {
      return void res.status(404).json({
        canEdit: false,
        reason: "not_found" as const,
      });
    }

    const hasBuyerBlockingTx = await hasBuyerBlockingTransactions(listingId);
    const gate = sellerCanEditListingFields({
      status: listing.status,
      openBidCount: listing.openBidCount,
      hasBuyerBlockingTx,
    });

    if (!gate.ok) {
      return void res.status(200).json({
        canEdit: false,
        reason: gate.reason,
        status: listing.status,
        openBidCount: listing.openBidCount ?? 0,
      });
    }

    return void res.status(200).json({
      canEdit: true,
      status: listing.status,
      openBidCount: listing.openBidCount ?? 0,
    });
  } catch (err) {
    console.log("getSellerListingEditMeta error:", err);
    return void res.status(500).json({ message: "Failed to read edit eligibility" });
  }
}
