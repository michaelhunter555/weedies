import type { Request, Response } from "express";

import { computeListingFeeUsd } from "../../lib/listing-fee";
import { isListingRelistEligible } from "../../lib/seller-listing-expired";
import Listing from "../../models/listing";
import stripe from "../../utils/stripe";
import User from "../../models/user";

/**
 * Re-submit an unsold listing under the same `_id` (listing fee applies).
 */
export async function relistListing(req: Request, res: Response) {
  try {
    const sellerId = req.user?.userId;
    if (!sellerId) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    const listingId = String(req.params.id ?? "").trim();
    const listing = await Listing.findOne({ _id: listingId, sellerId });
    if (!listing) {
      return void res.status(404).json({ message: "Listing not found" });
    }

    if (!isListingRelistEligible(listing)) {
      return void res.status(409).json({
        message:
          "Only expired, unsold listings can be relisted. Sold or active listings cannot use relist.",
      });
    }

    const user = await User.findById(sellerId);
    if (!user) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    const isPrivateListing = Boolean(listing.isPrivateListing);
    const priorListings = user.totalListings ?? 0;
    const listingFeeUsd = computeListingFeeUsd(priorListings, isPrivateListing);

    if (listingFeeUsd > 0 && !user.stripeCustomerId) {
      return void res.status(400).json({
        message:
          "Add a default payment method in your wallet before relisting a paid listing.",
      });
    }

    if (listingFeeUsd > 0) {
      if (!user.defaultPaymentIntendId) {
        return void res.status(400).json({
          message:
            "Add a default payment method in your wallet before relisting a paid listing.",
        });
      }

      const paymentIntent = await stripe.paymentIntents.create(
        {
          amount: Math.round(listingFeeUsd * 100),
          currency: "usd",
          customer: user.stripeCustomerId,
          description: isPrivateListing
            ? "Listing fee (relist, includes private listing)"
            : "Listing fee (relist)",
          payment_method: user.defaultPaymentIntendId,
          capture_method: "automatic",
          off_session: true,
          confirm: true,
          metadata: {
            listingId: String(listing._id),
            sellerId: String(user._id),
            paymentType: "listing-fee",
            isRelist: "true",
            isPrivateListing: isPrivateListing ? "true" : "false",
          },
        },
        {
          idempotencyKey: `${String(listing._id)}::relist::${Date.now()}`,
        },
      );

      listing.paymentIntentId = paymentIntent.id;
    }

    await User.findByIdAndUpdate(sellerId, { $inc: { totalListings: 1 } });

    listing.buyerId = undefined;
    listing.auctionFinalizedAt = undefined;
    listing.auctionWinningAmount = undefined;
    listing.auctionEndingSoonNotifiedAt = undefined;
    listing.auctionBids = [];
    listing.openBidCount = 0;
    listing.soldAt = undefined;
    listing.expiredAt = undefined;
    listing.rejectionReason = undefined;
    listing.auctionStartDate = undefined;
    listing.auctionEndDate = undefined;
    listing.status = "pending_review";
    listing.sellerCommittedAt = new Date();
    if (isPrivateListing) {
      listing.privateListingFeePaid = true;
    }

    await listing.save();

    return void res.status(200).json({
      ok: true,
      listing,
      listingFeeUsd,
      message:
        listingFeeUsd > 0
          ? "Relist submitted for review. Listing fee charged to your default payment method."
          : "Relist submitted for review.",
    });
  } catch (err) {
    console.error("relistListing:", err);
    return void res.status(500).json({ message: "Failed to relist listing" });
  }
}
