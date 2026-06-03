import type { Request, Response } from "express";
import mongoose from "mongoose";

import { computeListingFeeUsd } from "../../lib/listing-fee";
import {
  createListingFeeCheckoutSession,
  ensureStripeCustomerForUser,
  isCardlessListingFeeCheckout,
} from "../../lib/listing-fee-checkout";
import Listing from "../../models/listing";
import User from "../../models/user";

/**
 * Resume listing-fee payment for a listing stuck in `pending_listing_fee`.
 * Body: `{ listingId: string }`.
 */
export default async function createListingFeeCheckoutSessionHandler(
  req: Request,
  res: Response,
) {
  try {
    const sellerUserId = req.user?.userId;
    if (!sellerUserId) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    const listingIdRaw = (req.body as { listingId?: unknown })?.listingId;
    const listingId =
      typeof listingIdRaw === "string" ? listingIdRaw.trim() : String(listingIdRaw ?? "");
    if (!mongoose.isValidObjectId(listingId)) {
      return void res.status(400).json({ message: "Invalid listing id" });
    }

    const listing = await Listing.findOne({
      _id: listingId,
      sellerId: sellerUserId,
    }).select("_id appName status isPrivateListing sellerCommittedAt");
    if (!listing) {
      return void res.status(404).json({ message: "Listing not found" });
    }

    if (listing.status !== "pending_listing_fee") {
      return void res.status(409).json({
        message: "This listing does not have a pending listing fee payment.",
      });
    }

    const user = await User.findById(sellerUserId).select(
      "email name stripeCustomerId defaultPaymentIntendId totalListings",
    );
    if (!user) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    const priorListings = Math.max(0, (user.totalListings ?? 1) - 1);
    const listingFeeUsd = computeListingFeeUsd(
      priorListings,
      Boolean(listing.isPrivateListing),
    );
    if (listingFeeUsd <= 0) {
      return void res.status(400).json({ message: "No listing fee is due for this listing." });
    }

    const customerId = await ensureStripeCustomerForUser(user);
    const url = await createListingFeeCheckoutSession({
      customerId,
      listingId: String(listing._id),
      sellerId: sellerUserId,
      amountUsd: listingFeeUsd,
      description: listing.isPrivateListing
        ? "Listing fee (includes private listing)"
        : "Listing fee",
      listingFeeKind: "submit",
      cardlessCheckout: isCardlessListingFeeCheckout(user),
      isPrivateListing: Boolean(listing.isPrivateListing),
      idempotencyKey: `${String(listing._id)}::listing-fee-checkout::resume`,
    });

    return void res.status(200).json({ url });
  } catch (err) {
    console.error("createListingFeeCheckoutSessionHandler error:", err);
    const msg =
      err instanceof Error ? err.message : "Failed to create listing fee checkout";
    return void res.status(500).json({ message: msg });
  }
}
