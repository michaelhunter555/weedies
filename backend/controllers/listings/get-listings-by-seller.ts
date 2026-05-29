import type { Request, Response } from "express";
import Listing from "../../models/listing";
import { parsePageLimit } from "../../lib/parse-page-limit";
import { serializeSellerListings } from "../../lib/serialize-seller-listings";
import {
  getSellerListingsMeta,
  sellerListingStatusQuery,
  type SellerListingStatusFilter,
} from "../../lib/seller-listings-meta";

/**
 * Paginated listings owned by the authenticated seller.
 * Query: `page`, `limit` (max 50), `status` = `active` | `sold` | `all` (default `active`).
 */
export async function getListingsBySeller(req: Request, res: Response) {
  try {
    const sellerId = req.user?.userId;
    if (!sellerId) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    const statusRaw = String(req.query.status ?? "active").trim().toLowerCase();
    const status: SellerListingStatusFilter =
      statusRaw === "sold" || statusRaw === "all" ? statusRaw : "active";

    const { page, limit, skip, totalPages } = parsePageLimit(req, {
      page: 1,
      limit: 20,
      maxLimit: 50,
    });

    const filter = { sellerId, ...sellerListingStatusQuery(status) };

    const [listings, total, meta] = await Promise.all([
      Listing.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit),
      Listing.countDocuments(filter),
      getSellerListingsMeta(sellerId),
    ]);

    const items = await serializeSellerListings(listings);

    return void res.status(200).json({
      items,
      page,
      limit,
      total,
      totalPages: totalPages(total),
      meta,
    });
  } catch (err) {
    console.log("getListingsBySeller error:", err);
    return void res.status(500).json({ message: "Failed to fetch seller listings" });
  }
}
