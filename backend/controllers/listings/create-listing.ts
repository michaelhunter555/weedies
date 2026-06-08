import type { Request, Response } from "express";
import Listing from "../../models/listing";
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
import { applyListingLinkFields } from "../../lib/listing-link-urls";
import {
  createListingFeeCheckoutSession,
  ensureStripeCustomerForUser,
  isCardlessListingFeeCheckout,
} from "../../lib/listing-fee-checkout";
import {
  ensureUniqueListingSlug,
  slugifyAppName,
} from "../../utils/listing-slug";
import { buildOwnershipVerificationFields } from "../../lib/ensure-listing-ownership-verification";

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
 * Listing-fee Stripe Checkout (or free submit) + `User.totalListings` increment
 * run once per listing (`sellerCommittedAt` guards duplicate submits).
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
    const linkApplied = applyListingLinkFields(applied.data, {
      requirePlatformUrls: true,
    });
    if (!linkApplied.ok) {
      return void res.status(400).json({ message: linkApplied.message });
    }
    const safe = linkApplied.data;

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
    let listingFeeCheckoutUrl: string | undefined;

    listing.rejectionReason = undefined;
    listing.sellerCommittedAt = new Date();

    listing.ownershipVerification = buildOwnershipVerificationFields(
      String(listing._id),
      String(sellerId),
    );
    if (listingFeeUsd > 0) {
      const customerId = await ensureStripeCustomerForUser(user);
      listing.status = "pending_listing_fee";
      listing.privateListingFeePaid = isPrivateListing ? false : listing.privateListingFeePaid;
      await listing.save();

      listingFeeCheckoutUrl = await createListingFeeCheckoutSession({
        customerId,
        listingId: String(listing._id),
        sellerId: user._id.toString(),
        amountUsd: listingFeeUsd,
        description: isPrivateListing
          ? "Listing fee (includes private listing)"
          : "Listing fee",
        listingFeeKind: "submit",
        cardlessCheckout: isCardlessListingFeeCheckout(user),
        isPrivateListing,
        idempotencyKey: `${String(listing._id)}::listing-fee-checkout::submit`,
      });
    } else {
      listing.status = "pending_review";
      if (isPrivateListing) {
        listing.privateListingFeePaid = true;
      }
      await listing.save();
    }

    const listingJson = sanitizeListingDescriptionFields(
      listing.toObject() as Record<string, unknown>,
    );
    return void res.status(existingDraftId ? 200 : 201).json({
      ...listingJson,
      ...(listingFeeCheckoutUrl ? { listingFeeCheckoutUrl } : {}),
    });
  } catch (err) {
    console.log("createListing error:", err);
    return void res.status(500).json({ message: "Failed to create listing" });
  }
}
