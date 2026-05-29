import type { Request, Response } from "express";
import Listing from "../../models/listing";
import User from "../../models/user";
import stripe from "../../utils/stripe";
import { PRIVATE_LISTING_FEE_USD } from "../../lib/listing-fee";
import {
  hasBuyerBlockingTransactions,
  sellerCanEditListingFields,
} from "../../lib/listing-seller-edit";
import { parsePrivateListingFlag } from "../../lib/listing-submission-fields";

/** Seller-only: patch mutable fields on their own listing (blocked if bids / buyer purchases exist). */
export async function updateListing(req: Request, res: Response) {
  try {
    const sellerId = req.user?.userId;
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? String(rawId[0] ?? "") : String(rawId ?? "");
    if (!sellerId) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    // never let the client overwrite ownership / lifecycle / verification
    const {
      sellerId: _s,
      buyerId: _b,
      status: _st,
      soldAt: _so,
      publishedAt: _p,
      isListingVerified: _lv,
      isAnalyticsVerified: _av,
      verifiedProviders: _vp,
      googleAnalyticsPropertyResourceName: _gapr,
      googleAnalyticsPropertyDisplayName: _gapd,
      revenueCatProjectId: _rci,
      revenueCatProjectDisplayName: _rcd,
      views: _v,
      favoritesCount: _f,
      totalReviews: _tr,
      averageRating: _ar,
      sellerCommittedAt: _sca,
      paymentIntentId: _pi,
      privateListingFeePaid: _plfp,
      openBidCount: _obc,
      auctionBids: _ab,
      approvedUsersList: _aul,
      pendingPrivateListingRequests: _ppr,
      ...safe
    } = req.body || {};

    const existing = await Listing.findOne({ _id: id, sellerId });
    if (!existing) {
      return void res.status(404).json({ message: "Listing not found" });
    }

    const hasBuyerBlockingTx = await hasBuyerBlockingTransactions(id);
    const gate = sellerCanEditListingFields({
      status: existing.status,
      openBidCount: existing.openBidCount,
      hasBuyerBlockingTx,
    });

    if (!gate.ok) {
      const msg =
        gate.reason === "has_buyer_activity"
          ? "This listing has a purchase or recorded bid - you can’t change the listing details anymore."
          : gate.reason === "has_open_bids"
            ? "This listing has open bids - you can’t change the listing details until bids are cleared."
            : "This listing can’t be edited in its current state.";
      return void res.status(409).json({ message: msg, reason: gate.reason });
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const wantsPrivate =
      "isPrivateListing" in body
        ? parsePrivateListingFlag(body.isPrivateListing)
        : Boolean(existing.isPrivateListing);

    const turningOnPrivate =
      wantsPrivate &&
      !existing.isPrivateListing &&
      !existing.privateListingFeePaid;

    const patch: Record<string, unknown> = { ...safe, status: "pending_review" };

    if (turningOnPrivate) {
      const user = await User.findById(sellerId).select(
        "stripeCustomerId defaultPaymentIntendId",
      );
      if (!user?.stripeCustomerId || !user.defaultPaymentIntendId) {
        return void res.status(400).json({
          message:
            "Add a default payment method in your wallet before enabling private listing ($4.99).",
        });
      }

      const paymentIntent = await stripe.paymentIntents.create(
        {
          amount: Math.round(PRIVATE_LISTING_FEE_USD * 100),
          currency: "usd",
          customer: user.stripeCustomerId,
          description: "Private listing fee",
          payment_method: user.defaultPaymentIntendId,
          capture_method: "automatic",
          off_session: true,
          confirm: true,
          metadata: {
            listingId: String(existing._id),
            sellerId: String(user._id),
            paymentType: "listing-fee",
            isPrivateListing: "true",
            listingFeeKind: "private-addon",
          },
        },
        {
          idempotencyKey: `${String(existing._id)}::private-listing-fee`,
        },
      );

      patch.isPrivateListing = true;
      patch.privateListingFeePaid = true;
      if (!existing.paymentIntentId) {
        patch.paymentIntentId = paymentIntent.id;
      }
    }

    const listing = await Listing.findOneAndUpdate(
      { _id: id, sellerId },
      { $set: patch },
      { new: true },
    );

    if (!listing) {
      return void res.status(404).json({ message: "Listing not found" });
    }

    return void res.status(200).json(listing);
  } catch (err) {
    console.log("updateListing error:", err);
    return void res.status(500).json({ message: "Failed to update listing" });
  }
}
