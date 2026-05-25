import type { Request, Response } from "express";
import mongoose from "mongoose";

import Listing from "../../models/listing";
import Review from "../../models/review";
import User from "../../models/user";

type ReviewLean = {
  _id: unknown;
  listingId?: unknown;
  userId?: unknown;
  sellerId?: unknown;
  rating?: number | null;
  comment?: string;
  datePosted?: Date;
  purchaseDate?: Date;
  createdAt?: Date;
};

/**
 * GET /api/listings/:id/reviews?page=1&limit=10
 *
 * Returns the buyer reviews persisted on the `Review` collection for a
 * single listing. Includes a lightweight reviewer object (name + initial)
 * so the UI doesn't need a second round-trip. Anonymous viewers are
 * allowed because reviews back the public marketplace trust signals.
 */
export async function getListingReviews(req: Request, res: Response) {
  try {
    const raw = String(req.params.id ?? "").trim();
    if (!raw) {
      return void res.status(400).json({ message: "Invalid listing id" });
    }

    const listing = (mongoose.isValidObjectId(raw)
      ? await Listing.findById(raw).select("_id sellerId").lean()
      : await Listing.findOne({ slug: raw }).select("_id sellerId").lean()) as
      | { _id: unknown }
      | null;
    if (!listing) {
      return void res.status(404).json({ message: "Listing not found" });
    }
    const listingObjectId = new mongoose.Types.ObjectId(String(listing._id));

    const pageNum = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const limitNum = Math.min(
      50,
      Math.max(1, parseInt(String(req.query.limit ?? "10"), 10) || 10),
    );

    const [rowsRaw, total] = await Promise.all([
      Review.find({ listingId: listingObjectId })
        .sort({ createdAt: -1, datePosted: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Review.countDocuments({ listingId: listingObjectId }),
    ]);

    const rows = rowsRaw as ReviewLean[];

    const reviewerIds = [
      ...new Set(rows.map((r) => String(r.userId ?? "")).filter(Boolean)),
    ];
    const reviewers =
      reviewerIds.length > 0
        ? ((await User.find({ _id: { $in: reviewerIds } })
            .select("_id name")
            .lean()) as { _id: unknown; name?: string }[])
        : [];
    const nameById = new Map(
      reviewers.map((u) => [String(u._id), String(u.name ?? "Buyer")]),
    );

    const reviews = rows.map((r) => {
      const reviewerId = String(r.userId ?? "");
      return {
        _id: String(r._id ?? ""),
        rating: typeof r.rating === "number" ? r.rating : null,
        comment: String(r.comment ?? ""),
        purchaseDate:
          r.purchaseDate instanceof Date ? r.purchaseDate.toISOString() : null,
        datePosted:
          (r.createdAt ?? r.datePosted) instanceof Date
            ? ((r.createdAt ?? r.datePosted) as Date).toISOString()
            : null,
        reviewer: reviewerId
          ? { id: reviewerId, name: nameById.get(reviewerId) ?? "Buyer" }
          : null,
      };
    });

    return void res.status(200).json({
      ok: true,
      reviews,
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    });
  } catch (err) {
    console.error("getListingReviews:", err);
    return void res
      .status(500)
      .json({ ok: false, message: "Failed to load reviews" });
  }
}
