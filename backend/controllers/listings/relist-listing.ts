import type { Request, Response } from "express";

import { computeListingFeeUsd } from "../../lib/listing-fee";
import {
  createListingFeeCheckoutSession,
  ensureStripeCustomerForUser,
  isCardlessListingFeeCheckout,
} from "../../lib/listing-fee-checkout";
import { isListingRelistEligible } from "../../lib/seller-listing-expired";
import Listing from "../../models/listing";
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
    listing.sellerCommittedAt = new Date();

    let listingFeeCheckoutUrl: string | undefined;

    if (listingFeeUsd > 0) {
      const customerId = await ensureStripeCustomerForUser(user);
      listing.status = "pending_listing_fee";
      listing.privateListingFeePaid = isPrivateListing ? false : listing.privateListingFeePaid;
      listingFeeCheckoutUrl = await createListingFeeCheckoutSession({
        customerId,
        listingId: String(listing._id),
        sellerId: String(user._id),
        amountUsd: listingFeeUsd,
        description: isPrivateListing
          ? "Listing fee (relist, includes private listing)"
          : "Listing fee (relist)",
        listingFeeKind: "relist",
        cardlessCheckout: isCardlessListingFeeCheckout(user),
        isPrivateListing,
        idempotencyKey: `${String(listing._id)}::listing-fee-checkout::relist`,
      });
    } else {
      listing.status = "pending_review";
      if (isPrivateListing) {
        listing.privateListingFeePaid = true;
      }
    }

    await listing.save();

    return void res.status(200).json({
      ok: true,
      listing,
      listingFeeUsd,
      ...(listingFeeCheckoutUrl ? { listingFeeCheckoutUrl } : {}),
      message: listingFeeCheckoutUrl
        ? "Complete payment in Stripe Checkout to finish your relist."
        : listingFeeUsd > 0
          ? "Relist submitted for review."
          : "Relist submitted for review.",
    });
  } catch (err) {
    console.error("relistListing:", err);
    return void res.status(500).json({ message: "Failed to relist listing" });
  }
}
