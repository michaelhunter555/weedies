import type { Request, Response } from "express";
import mongoose from "mongoose";
import {
  attachAuctionSummary,
  countPendingAuctionBids,
} from "../../lib/listing-auction-summary";
import { auctionBidsClientJson } from "../../lib/listing-auction-bids-client";
import { enrichPendingPrivateListingRequests } from "../../lib/enrich-private-listing-requests";
import { sanitizeListingDescriptionFields } from "../../lib/listing-description";
import { sanitizeListingOwnershipVerification } from "../../lib/sanitize-listing-ownership";
import Listing from "../../models/listing";

const populateSeller = {
  path: "sellerId",
  select:
    "name email isVerifiedCreator hasVerifiedAnalytics sellerRating totalSellerReviews totalListingsSold",
} as const;

function listingOwnerIdString(listing: { sellerId?: unknown }): string {
  const sid = listing.sellerId;
  if (!sid) return "";
  if (sid instanceof mongoose.Types.ObjectId) return String(sid);
  if (typeof sid === "object" && sid !== null && "_id" in sid) {
    return String((sid as { _id: unknown })._id);
  }
  return String(sid);
}

/** Fetch a single listing by `_id` or `slug`. Bumps the view counter after slug check (when `?slug=` is used). */
export async function getListingById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const raw = Array.isArray(id) ? id[0] : id;
    if (!raw || typeof raw !== "string") {
      return void res.status(400).json({ message: "Invalid listing id" });
    }

    const expectedSlugRaw = req.query.slug;
    const expectedSlug =
      typeof expectedSlugRaw === "string"
        ? expectedSlugRaw.trim()
        : Array.isArray(expectedSlugRaw)
          ? String(expectedSlugRaw[0] ?? "").trim()
          : "";

    const tryById = mongoose.isValidObjectId(raw);

    let listing = null;

    if (tryById) {
      listing = await Listing.findOne({ _id: raw }).populate(populateSeller);
    }

    if (!listing) {
      listing = await Listing.findOne({ slug: raw }).populate(populateSeller);
    }

    if (!listing) {
      return void res.status(404).json({ message: "Listing not found" });
    }

    if (expectedSlug && listing.slug !== expectedSlug) {
      return void res.status(404).json({ message: "Listing not found" });
    }

    const viewerId = req.user?.userId ?? "";
    const ownerId = listingOwnerIdString(listing);
    const isSellerViewingOwn = Boolean(viewerId && ownerId && viewerId === ownerId);

    const plain = sanitizeListingOwnershipVerification(
      sanitizeListingDescriptionFields(
        listing.toObject() as Record<string, unknown>,
      ),
      { isSeller: isSellerViewingOwn },
    );

    if (listing.isPrivateListing && !isSellerViewingOwn) {
      const approved = Array.isArray(listing.approvedUsersList)
        ? listing.approvedUsersList.map((userId: unknown) => String(userId))
        : [];
      const canView = Boolean(viewerId && approved.includes(viewerId));
      const requestRows = Array.isArray(listing.pendingPrivateListingRequests)
        ? (listing.pendingPrivateListingRequests as Array<{
            _id?: unknown;
            requesterId?: unknown;
            status?: "pending" | "approved" | "denied";
          }>)
        : [];
      const mine = viewerId
        ? requestRows.find((r: { requesterId?: unknown }) => String(r.requesterId) === viewerId)
        : undefined;
      if (!canView) {
        const restricted = {
          ...plain,
          appName: "Private listing",
          tagline: "Request access to unlock full listing details.",
          appDescription:
            "This listing is private. The seller must approve your request before full details are shown.",
          photos: [],
          demoUrl: undefined,
          repoUrl: undefined,
          liveUrl: undefined,
          tags: [],
          techStack: [],
          sellerId: null,
          privateAccess: {
            canView: false,
            status: mine?.status ?? "none",
            requestId: mine?._id ? String(mine._id) : null,
          },
        } as Record<string, unknown>;
        const { auctionBids: _ab, ...restRestricted } = restricted as Record<string, unknown>;
        return void res.status(200).json(restRestricted);
      }
    }

    await Listing.updateOne({ _id: listing._id }, { $inc: { views: 1 } });
    listing.views = (listing.views ?? 0) + 1;

    const sellerPrivateRequests = isSellerViewingOwn
      ? await enrichPendingPrivateListingRequests(
          listing.pendingPrivateListingRequests as Parameters<
            typeof enrichPendingPrivateListingRequests
          >[0],
        )
      : null;

    if (listing.saleType === "auction") {
      const summarized = attachAuctionSummary({
        ...plain,
        privateAccess: { canView: true, status: "approved" },
      }) as Record<string, unknown>;
      if (!isSellerViewingOwn) {
        const {
          auctionBids: _ab,
          approvedUsersList: _aul,
          pendingPrivateListingRequests: _ppr,
          ...safePublic
        } = summarized as Record<string, unknown>;
        return void res.status(200).json(safePublic);
      }
      if (isSellerViewingOwn) {
        return void res.status(200).json({
          ...summarized,
          pendingPrivateListingRequests: sellerPrivateRequests ?? [],
          auctionBids: auctionBidsClientJson(listing.auctionBids),
          auctionPendingBidCount: countPendingAuctionBids(listing.auctionBids),
        });
      }
      return void res.status(200).json(summarized);
    }
    const { auctionBids: _ab, ...rest } = {
      ...plain,
      privateAccess: { canView: true, status: "approved" },
    } as Record<string, unknown>;
    if (!isSellerViewingOwn) {
      const {
        approvedUsersList: _aul,
        pendingPrivateListingRequests: _ppr,
        ...safePublic
      } = rest;
      return void res.status(200).json(safePublic);
    }
    return void res.status(200).json({
      ...rest,
      pendingPrivateListingRequests: sellerPrivateRequests ?? [],
    });
  } catch (err) {
    console.log("getListingById error:", err);
    return void res.status(500).json({ message: "Failed to fetch listing" });
  }
}
