import type { Request, Response } from "express";
import Listing from "../../models/listing";

/**
 * Public marketplace feed. Supports basic filtering + pagination via
 * query params: ?category=ai-tools&difficulty=beginner&q=foo&page=1&limit=24
 *
 * TODO: full-text search, sorting, price range, verified-only filter.
 */
export async function getAllListings(req: Request, res: Response) {
  try {
    const {
      category,
      difficulty,
      turnaround,
      saleType,
      q,
      page = "1",
      limit = "24",
    } = req.query as Record<string, string | undefined>;

    const filter: Record<string, unknown> = { status: "live" };
    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;
    if (turnaround) filter.turnaround = turnaround;
    if (saleType) filter.saleType = saleType;
    if (q) filter.$text = { $search: q };

    const pageNum = Math.max(1, Number(page) || 1);
    const lim = Math.min(60, Math.max(1, Number(limit) || 24));

    const [items, total] = await Promise.all([
      Listing.find(filter)
        .sort({ publishedAt: -1 })
        .skip((pageNum - 1) * lim)
        .limit(lim)
        .populate("sellerId", "name email isVerifiedCreator hasVerifiedAnalytics"),
      Listing.countDocuments(filter),
    ]);

    return void res.status(200).json({ items, total, page: pageNum, limit: lim });
  } catch (err) {
    console.log("getAllListings error:", err);
    return void res.status(500).json({ message: "Failed to fetch listings" });
  }
}
