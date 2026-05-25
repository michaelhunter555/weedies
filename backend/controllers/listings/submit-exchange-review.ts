import type { Request, Response } from "express";
import mongoose from "mongoose";

import { io } from "../../app";
import { SocketEvents } from "../../lib/socket-events";
import ListingExchange from "../../models/exchange";
import Listing from "../../models/listing";
import Review from "../../models/review";
import User from "../../models/user";

/** One sold listing → at most one post-sale review; set listing stats directly (no aggregate). */
async function applyPostSaleReviewToListing(
  listingObjectId: mongoose.Types.ObjectId,
  rating: number | undefined,
) {
  const averageRating =
    typeof rating === "number" && Number.isFinite(rating)
      ? Math.round(rating * 100) / 100
      : 0;
  await Listing.updateOne(
    { _id: listingObjectId },
    { $set: { totalReviews: 1, averageRating } },
  );
}

/**
 * Seller: bump review count; recompute star average only when this review includes a rating.
 * (`$avg` is not a valid field-update operator — compute in app code.)
 */
async function applyPostSaleReviewToSeller(
  sellerOid: mongoose.Types.ObjectId,
  rating: number | undefined,
) {
  const seller = (await User.findById(sellerOid)
    .select("sellerRating totalSellerReviews")
    .lean()) as { sellerRating?: number; totalSellerReviews?: number } | null;
  if (!seller) return;

  const prevN = seller.totalSellerReviews ?? 0;
  const prevAvg = seller.sellerRating ?? 0;
  const nextN = prevN + 1;

  let nextAvg = prevAvg;
  if (typeof rating === "number" && Number.isFinite(rating)) {
    nextAvg = (prevAvg * prevN + rating) / nextN;
  }

  await User.updateOne(
    { _id: sellerOid },
    {
      $set: {
        totalSellerReviews: nextN,
        sellerRating: Math.round(nextAvg * 100) / 100,
      },
    },
  );
}

/**
 * Buyer-only: after confirming receipt, may submit one optional review (stars and/or note).
 */
export async function submitExchangeReview(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    const listingId = Array.isArray(req.params.listingId)
      ? String(req.params.listingId[0] ?? "")
      : String(req.params.listingId ?? "");
    if (!mongoose.isValidObjectId(listingId)) {
      return void res.status(400).json({ message: "Invalid listing id" });
    }

    const body = req.body as { rating?: unknown; comment?: unknown };
    let rating: number | undefined;
    if (body.rating !== undefined && body.rating !== null && body.rating !== "") {
      const n = Number(body.rating);
      if (!Number.isInteger(n) || n < 0 || n > 5) {
        return void res.status(400).json({ message: "Rating must be an integer from 0 to 5." });
      }
      rating = n;
    }

    const commentRaw = typeof body.comment === "string" ? body.comment.trim() : "";
    const comment = commentRaw.slice(0, 2000);

    if (rating === undefined && !comment) {
      return void res.status(400).json({
        message: "Add a star rating (0–5) and/or a short written note.",
      });
    }

    const listing = await Listing.findById(listingId).select("status buyerId sellerId soldAt");
    if (!listing || listing.status !== "sold") {
      return void res.status(404).json({ message: "Listing not found or not sold." });
    }

    const buyerId = listing.buyerId ? String(listing.buyerId) : "";
    if (!buyerId || userId !== buyerId) {
      return void res.status(403).json({ message: "Only the buyer can leave this review." });
    }

    const ex = await ListingExchange.findOne({ listingId: listing._id }).select("buyerConfirmedAt");
    if (!ex?.buyerConfirmedAt) {
      return void res.status(409).json({
        message: "Confirm receipt first; then you can leave an optional review.",
      });
    }

    const existing = await Review.findOne({
      listingId: listing._id,
      userId: new mongoose.Types.ObjectId(userId),
    })
      .select("_id")
      .lean();
    if (existing) {
      return void res.status(409).json({ message: "You already submitted a review for this sale." });
    }

    const sellerIdRaw = listing.sellerId;
    const sellerOid =
      sellerIdRaw instanceof mongoose.Types.ObjectId
        ? sellerIdRaw
        : new mongoose.Types.ObjectId(String(sellerIdRaw));

    const purchaseDate =
      listing.soldAt instanceof Date ? listing.soldAt : ex.buyerConfirmedAt ?? new Date();

    const doc: Record<string, unknown> = {
      listingId: listing._id,
      userId: new mongoose.Types.ObjectId(userId),
      sellerId: sellerOid,
      purchaseDate,
      comment,
    };
    if (rating !== undefined) {
      doc.rating = rating;
    }

    const created = await Review.create(doc);

    await applyPostSaleReviewToListing(listing._id as mongoose.Types.ObjectId, rating);
    await applyPostSaleReviewToSeller(sellerOid, rating);

    // Notify the seller (their stored rating just changed) and the buyer
    // (their submitted-review cache should refresh on their own dashboard).
    const reviewPayload = {
      message: "A buyer left a review on your listing.",
      listingId: String(listing._id),
    };
    if (io.sockets.adapter.rooms.get(String(sellerOid))?.size) {
      io.to(String(sellerOid)).emit(SocketEvents.NEW_REVIEW, reviewPayload);
    }
    if (io.sockets.adapter.rooms.get(String(userId))?.size) {
      io.to(String(userId)).emit(SocketEvents.NEW_REVIEW, {
        ...reviewPayload,
        message: "Your review was published.",
      });
    }

    return void res.status(201).json({
      buyerReview: {
        _id: String(created._id),
        rating: created.rating ?? null,
        comment: created.comment ?? "",
        datePosted: (created.datePosted ?? new Date()).toISOString(),
      },
    });
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && (err as { code?: number }).code === 11000) {
      return void res.status(409).json({ message: "You already submitted a review for this sale." });
    }
    console.log("submitExchangeReview error:", err);
    return void res.status(500).json({ message: "Failed to submit review" });
  }
}
