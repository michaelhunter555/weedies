import Listing from "../models/listing";
import {
  parseOptionalNonNegNumber,
  parsePrivateListingFlag,
} from "./listing-submission-fields";
import {
  APP_DESCRIPTION_MIN_PLAIN_TEXT,
  applySanitizedListingFields,
  sanitizeListingDescriptionFields,
} from "./listing-description";
import { applyListingLinkFields } from "./listing-link-urls";
import { buildOwnershipVerificationFields } from "./ensure-listing-ownership-verification";
import { getPlatformOwnerUserId } from "./platform-owner";
import {
  ensureUniqueListingSlug,
  slugifyAppName,
} from "../utils/listing-slug";

/** Strip server-controlled fields from admin/seller write payloads. */
export function stripListingWriteGuards(body: Record<string, unknown>) {
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
    isPlatformListing: _ipl,
    ...safe
  } = body || {};
  return safe;
}

export type CreatePlatformListingResult =
  | { ok: true; listing: Record<string, unknown> }
  | { ok: false; status: number; message: string };

/**
 * Creates a platform-managed listing owned by ADMIN_CREATE_EMAIL user.
 * Skips listing fees, Stripe Connect, and marketplace purchase checkout.
 */
export async function createPlatformListingFromBody(
  body: Record<string, unknown>,
): Promise<CreatePlatformListingResult> {
  let sellerId: string;
  try {
    sellerId = await getPlatformOwnerUserId();
  } catch (err) {
    return {
      ok: false,
      status: 503,
      message: err instanceof Error ? err.message : "Platform owner not configured",
    };
  }

  const isPrivateListing = parsePrivateListingFlag(body.isPrivateListing);
  if (isPrivateListing) {
    return {
      ok: false,
      status: 400,
      message: "Private listings are not supported for platform-managed listings.",
    };
  }

  const monthlyRevenue = parseOptionalNonNegNumber(body.monthlyRevenue);
  const monthlyActiveUsers = parseOptionalNonNegNumber(body.monthlyActiveUsers);

  const applied = applySanitizedListingFields(
    {
      ...stripListingWriteGuards(body),
      isPrivateListing: false,
      ...(monthlyRevenue !== undefined ? { monthlyRevenue } : {}),
      ...(monthlyActiveUsers !== undefined ? { monthlyActiveUsers } : {}),
    },
    { minPlainText: APP_DESCRIPTION_MIN_PLAIN_TEXT },
  );
  if (!applied.ok) {
    return { ok: false, status: 400, message: applied.message };
  }

  const linkApplied = applyListingLinkFields(applied.data, {
    requirePlatformUrls: true,
  });
  if (!linkApplied.ok) {
    return { ok: false, status: 400, message: linkApplied.message };
  }
  const safe = linkApplied.data;

  const fromClient =
    typeof body.slug === "string" && body.slug.trim().length > 0
      ? slugifyAppName(body.slug)
      : slugifyAppName(String(body.appName ?? "app"));

  const slug = await ensureUniqueListingSlug(fromClient);
  const now = new Date();

  const listing = new Listing({
    ...safe,
    sellerId,
    slug,
    isPlatformListing: true,
    status: "live",
    publishedAt: now,
    sellerCommittedAt: now,
    privateListingFeePaid: false,
    isPrivateListing: false,
  });

  listing.ownershipVerification = buildOwnershipVerificationFields(
    String(listing._id),
    sellerId,
  );

  await listing.save();

  return {
    ok: true,
    listing: sanitizeListingDescriptionFields(
      listing.toObject() as Record<string, unknown>,
    ),
  };
}

export type UpdatePlatformListingResult = CreatePlatformListingResult;

/**
 * Updates a platform-managed listing owned by ADMIN_CREATE_EMAIL user.
 */
export async function updatePlatformListingFromBody(
  listingId: string,
  body: Record<string, unknown>,
): Promise<UpdatePlatformListingResult> {
  let sellerId: string;
  try {
    sellerId = await getPlatformOwnerUserId();
  } catch (err) {
    return {
      ok: false,
      status: 503,
      message: err instanceof Error ? err.message : "Platform owner not configured",
    };
  }

  const existing = await Listing.findOne({
    _id: listingId,
    sellerId,
    isPlatformListing: true,
  });
  if (!existing) {
    return { ok: false, status: 404, message: "Platform listing not found." };
  }

  if (existing.status === "sold" || existing.status === "removed") {
    return {
      ok: false,
      status: 409,
      message: "This listing cannot be edited in its current state.",
    };
  }

  const isPrivateListing = parsePrivateListingFlag(body.isPrivateListing);
  if (isPrivateListing) {
    return {
      ok: false,
      status: 400,
      message: "Private listings are not supported for platform-managed listings.",
    };
  }

  const monthlyRevenue = parseOptionalNonNegNumber(body.monthlyRevenue);
  const monthlyActiveUsers = parseOptionalNonNegNumber(body.monthlyActiveUsers);

  const applied = applySanitizedListingFields(
    {
      ...stripListingWriteGuards(body),
      isPrivateListing: false,
      ...(monthlyRevenue !== undefined ? { monthlyRevenue } : {}),
      ...(monthlyActiveUsers !== undefined ? { monthlyActiveUsers } : {}),
    },
    { minPlainText: APP_DESCRIPTION_MIN_PLAIN_TEXT },
  );
  if (!applied.ok) {
    return { ok: false, status: 400, message: applied.message };
  }

  const linkApplied = applyListingLinkFields(applied.data, {
    requirePlatformUrls: true,
  });
  if (!linkApplied.ok) {
    return { ok: false, status: 400, message: linkApplied.message };
  }
  const safe = linkApplied.data;

  const nextAppName = String(safe.appName ?? existing.appName ?? "").trim();
  if (nextAppName && nextAppName !== existing.appName) {
    existing.slug = await ensureUniqueListingSlug(
      slugifyAppName(nextAppName),
      String(existing._id),
    );
  }

  Object.assign(existing, safe);
  existing.isPlatformListing = true;
  existing.isPrivateListing = false;

  if (!existing.ownershipVerification?.verificationToken) {
    existing.ownershipVerification = buildOwnershipVerificationFields(
      String(existing._id),
      sellerId,
      existing.ownershipVerification ?? undefined,
    );
  }

  await existing.save();

  return {
    ok: true,
    listing: sanitizeListingDescriptionFields(
      existing.toObject() as Record<string, unknown>,
    ),
  };
}
