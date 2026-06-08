import type { Request, Response } from "express";
import Listing from "../../models/listing";
import User from "../../models/user";
import { PRIVATE_LISTING_FEE_USD } from "../../lib/listing-fee";
import {
  createListingFeeCheckoutSession,
  ensureStripeCustomerForUser,
  isCardlessListingFeeCheckout,
} from "../../lib/listing-fee-checkout";
import {
  hasBuyerBlockingTransactions,
  sellerCanEditListingFields,
} from "../../lib/listing-seller-edit";
import {
  APP_DESCRIPTION_MIN_PLAIN_TEXT,
  applySanitizedListingFields,
  sanitizeListingDescriptionFields,
} from "../../lib/listing-description";
import { applyListingLinkFields } from "../../lib/listing-link-urls";
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
      ownershipVerification: _ov,
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

    const applied = applySanitizedListingFields(
      { ...safe },
      "appDescription" in safe
        ? { minPlainText: APP_DESCRIPTION_MIN_PLAIN_TEXT }
        : undefined,
    );
    if (!applied.ok) {
      return void res.status(400).json({ message: applied.message });
    }

    const linkApplied = applyListingLinkFields(applied.data, {
      requirePlatformUrls: true,
    });
    if (!linkApplied.ok) {
      return void res.status(400).json({ message: linkApplied.message });
    }

    const patch: Record<string, unknown> = {
      ...linkApplied.data,
      status: "pending_review",
    };

    let listingFeeCheckoutUrl: string | undefined;

    if (turningOnPrivate) {
      const user = await User.findById(sellerId).select(
        "email name stripeCustomerId defaultPaymentIntendId",
      );
      if (!user) {
        return void res.status(401).json({ message: "Unauthorized" });
      }

      patch.isPrivateListing = true;
      patch.privateListingFeePaid = false;

      const listing = await Listing.findOneAndUpdate(
        { _id: id, sellerId },
        { $set: patch },
        { new: true },
      );
      if (!listing) {
        return void res.status(404).json({ message: "Listing not found" });
      }

      const customerId = await ensureStripeCustomerForUser(user);
      listingFeeCheckoutUrl = await createListingFeeCheckoutSession({
        customerId,
        listingId: String(listing._id),
        sellerId: String(user._id),
        amountUsd: PRIVATE_LISTING_FEE_USD,
        description: "Private listing fee",
        listingFeeKind: "private-addon",
        cardlessCheckout: isCardlessListingFeeCheckout(user),
        isPrivateListing: true,
        idempotencyKey: `${String(listing._id)}::listing-fee-checkout::private-addon`,
      });

      const body = sanitizeListingDescriptionFields(
        listing.toObject() as Record<string, unknown>,
      );
      return void res.status(200).json({
        ...body,
        listingFeeCheckoutUrl,
      });
    }

    const listing = await Listing.findOneAndUpdate(
      { _id: id, sellerId },
      { $set: patch },
      { new: true },
    );

    if (!listing) {
      return void res.status(404).json({ message: "Listing not found" });
    }

    return void res.status(200).json(
      sanitizeListingDescriptionFields(
        listing.toObject() as Record<string, unknown>,
      ),
    );
  } catch (err) {
    console.log("updateListing error:", err);
    return void res.status(500).json({ message: "Failed to update listing" });
  }
}
