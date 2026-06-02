import type { Request, Response } from "express";
import Listing from "../../models/listing";
import stripe from "../../utils/stripe";
import User from "../../models/user";
import {
  parseOptionalNonNegNumber,
  parsePrivateListingFlag,
} from "../../lib/listing-submission-fields";
import { computeListingFeeUsd } from "../../lib/listing-fee";
import {
  APP_DESCRIPTION_MIN_PLAIN_TEXT,
  applySanitizedListingFields,
  sanitizeListingDescriptionFields,
} from "../../lib/listing-description";
import {
  ensureUniqueListingSlug,
  slugifyAppName,
} from "../../utils/listing-slug";

/** Writable submission fields - same guard as `update-listing`. */
function safeListingWrite(body: Record<string, unknown>) {
  const {
    existingDraftId: _ed,
    draftListingId: _dd,
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
    sellerCommittedAt: _sc,
    paymentIntentId: _pi,
    slug: _slug,
    approvedUsersList: _aul,
    pendingPrivateListingRequests: _ppr,
    ...safe
  } = body || {};
  return safe;
}

/**
 * Creates a new listing in `draft` state owned by the authenticated seller,
 * or finalizes an existing saved draft when `existingDraftId` is provided.
 *
 * Listing-fee Stripe PI + `User.totalListings` increment run once per listing
 * (`sellerCommittedAt` guards duplicate submits for the same draft).
 */
export async function createListing(req: Request, res: Response) {
  try {
    const sellerId = req.user?.userId;
    const user = await User.findById(sellerId);
    if (!user) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const existingDraftIdRaw = body.existingDraftId;
    const existingDraftId =
      typeof existingDraftIdRaw === "string" && existingDraftIdRaw.trim()
        ? existingDraftIdRaw.trim()
        : undefined;

    const isPrivateListing = parsePrivateListingFlag(body.isPrivateListing);
    const priorListings = user.totalListings ?? 0;
    const estimatedListingFeeUsd = computeListingFeeUsd(
      priorListings,
      isPrivateListing,
    );
    if (estimatedListingFeeUsd > 0 && !user.stripeCustomerId) {
      return void res.status(400).json({
        message:
          "Add a default payment method in your wallet before submitting a paid listing.",
      });
    }
    const monthlyRevenue = parseOptionalNonNegNumber(body.monthlyRevenue);

    const applied = applySanitizedListingFields(
      {
        ...safeListingWrite(body),
        isPrivateListing,
        ...(monthlyRevenue !== undefined ? { monthlyRevenue } : {}),
      },
      { minPlainText: APP_DESCRIPTION_MIN_PLAIN_TEXT },
    );
    if (!applied.ok) {
      return void res.status(400).json({ message: applied.message });
    }
    const safe = applied.data;

    const fromClient =
      typeof body.slug === "string" && body.slug.trim().length > 0
        ? slugifyAppName(body.slug)
        : slugifyAppName(String(body.appName ?? "app"));

    let listing;

    if (existingDraftId) {
      const draft = await Listing.findOne({
        _id: existingDraftId,
        sellerId,
        status: "draft",
      });
      if (!draft) {
        return void res
          .status(404)
          .json({ message: "Draft listing not found" });
      }

      if (draft.sellerCommittedAt) {
        return void res.status(200).json(
          sanitizeListingDescriptionFields(
            draft.toObject() as Record<string, unknown>,
          ),
        );
      }

      const slug = await ensureUniqueListingSlug(
        fromClient || slugifyAppName(String(body.appName ?? draft.appName)),
        String(draft._id),
      );

      draft.set({
        ...safe,
        sellerId,
        slug,
        status: "draft" as const,
      });
      listing = draft;
    } else {
      const slug = await ensureUniqueListingSlug(fromClient);
      listing = new Listing({
        ...safe,
        sellerId,
        slug,
        status: "draft" as const,
      });
    }

    await listing.save();

    if (listing.sellerCommittedAt) {
      return void res.status(200).json(
        sanitizeListingDescriptionFields(
          listing.toObject() as Record<string, unknown>,
        ),
      );
    }

    await User.findByIdAndUpdate(sellerId, { $inc: { totalListings: 1 } });

    const listingFeeUsd = computeListingFeeUsd(priorListings, isPrivateListing);

    if (listingFeeUsd > 0) {
      if (!user.stripeCustomerId || !user.defaultPaymentIntendId) {
        return void res.status(400).json({
          message:
            "Add a default payment method in your wallet before submitting a paid listing.",
        });
      }

      const paymentIntent = await stripe.paymentIntents.create(
        {
          amount: Math.round(listingFeeUsd * 100),
          currency: "usd",
          customer: user.stripeCustomerId,
          description: isPrivateListing
            ? "Listing fee (includes private listing)"
            : "Listing fee",
          payment_method: user.defaultPaymentIntendId,
          capture_method: "automatic",
          off_session: true,
          confirm: true,
          metadata: {
            listingId: String(listing._id),
            sellerId: user._id.toString(),
            paymentType: "listing-fee",
            isPrivateListing: isPrivateListing ? "true" : "false",
          },
        },
        {
          idempotencyKey: `${String(listing._id)}::stripe:payment-intent:create`,
        },
      );

      listing.paymentIntentId = paymentIntent.id;
    }

    // Submission always enters moderation queue first.
    listing.status = "pending_review";
    listing.rejectionReason = undefined;
    listing.sellerCommittedAt = new Date();
    if (isPrivateListing) {
      listing.privateListingFeePaid = true;
    }
    await listing.save();

    return void res.status(existingDraftId ? 200 : 201).json(
      sanitizeListingDescriptionFields(
        listing.toObject() as Record<string, unknown>,
      ),
    );
  } catch (err) {
    console.log("createListing error:", err);
    return void res.status(500).json({ message: "Failed to create listing" });
  }
}
