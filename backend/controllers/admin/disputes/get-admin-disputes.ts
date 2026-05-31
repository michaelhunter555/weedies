import type { Request, Response } from "express";

import { serializeDispute } from "../../../lib/serialize-dispute";
import Dispute from "../../../models/disputes";
import Listing from "../../../models/listing";

function parsePageLimit(req: Request) {
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);
  const rawLimit = Number.parseInt(String(req.query.limit ?? "25"), 10) || 25;
  const limit = Math.min(100, Math.max(1, rawLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * GET /api/admin/disputes
 */
export async function getAdminDisputes(req: Request, res: Response) {
  try {
    const { page, limit, skip } = parsePageLimit(req);
    const status =
      typeof req.query.status === "string" ? req.query.status.trim() : "";
    const q =
      typeof req.query.q === "string" ? req.query.q.trim() : "";

    const filter: Record<string, unknown> = {};
    if (status) filter.disputeStatus = status;

    if (q) {
      filter.$or = [
        { initiatorName: { $regex: q, $options: "i" } },
        { sellerName: { $regex: q, $options: "i" } },
        { category: { $regex: q, $options: "i" } },
        { disputeExplanation: { $regex: q, $options: "i" } },
      ];
    }

    const [rows, total] = await Promise.all([
      Dispute.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Dispute.countDocuments(filter),
    ]);

    const listingIds = [...new Set(rows.map((d) => String(d.listingId)))];
    const listings = await Listing.find({ _id: { $in: listingIds } })
      .select("appName slug status")
      .lean();
    const listingById = new Map(
      listings.map((l) => [String(l._id), l]),
    );

    const items = rows.map((d) => {
      const listing = listingById.get(String(d.listingId));
      return {
        ...serializeDispute(d),
        listingAppName: listing?.appName ?? "Listing",
        listingSlug: listing?.slug ?? "",
        listingStatus: listing?.status ?? "",
      };
    });

    return void res.json({ ok: true, items, total, page, limit });
  } catch (err) {
    console.error("getAdminDisputes:", err);
    return void res.status(500).json({ message: "Failed to load disputes" });
  }
}
