import type { Request, Response } from "express";
import Listing from "../../../models/listing";

const PENDING_STATUSES = [
  "draft",
  "pending_review",
  "paused",
  "rejected",
] as const;

function parsePageLimit(req: Request) {
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);
  const rawLimit = Number.parseInt(String(req.query.limit ?? "25"), 10) || 25;
  const limit = Math.min(100, Math.max(1, rawLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export async function getPendingListings(req: Request, res: Response) {
  try {
    const { page, limit, skip } = parsePageLimit(req);
    const filter = { status: { $in: [...PENDING_STATUSES] } };

    const [items, total] = await Promise.all([
      Listing.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("sellerId", "email name")
        .lean(),
      Listing.countDocuments(filter),
    ]);

    res.json({ items, total, page, limit });
  } catch {
    res.status(500).json({ message: "Failed to load pending listings" });
  }
}

export async function getActiveListings(req: Request, res: Response) {
  try {
    const { page, limit, skip } = parsePageLimit(req);
    const filter = { status: "live" as const };

    const [items, total] = await Promise.all([
      Listing.find(filter)
        .sort({ publishedAt: -1, updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("sellerId", "email name")
        .lean(),
      Listing.countDocuments(filter),
    ]);

    res.json({ items, total, page, limit });
  } catch {
    res.status(500).json({ message: "Failed to load active listings" });
  }
}
