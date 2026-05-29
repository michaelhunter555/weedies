import type { Request, Response } from "express";
import mongoose from "mongoose";

import Listing from "../../models/listing";
import Transaction from "../../models/transactions";

import { LISTING_PURCHASE_BILLING_REASONS } from "../../lib/listing-purchase-billing";
import { parsePageLimit } from "../../lib/parse-page-limit";

function pickCoverUrl(
  photos: string[] | undefined,
  coverIndex: number | undefined,
): string | null {
  const list = photos ?? [];
  if (!list.length) return null;
  const idx = Math.min(Math.max(0, coverIndex ?? 0), list.length - 1);
  return list[idx] ?? null;
}

function paginatedEmpty(page: number, limit: number) {
  return {
    items: [],
    page,
    limit,
    total: 0,
    totalPages: 1,
  };
}

/**
 * Buy-it-now purchases (buyer) and sales (seller), paginated separately.
 * Query: `purchasePage`, `salePage`, `limit` (max 50, default 20).
 */
export async function getMyMarketplaceOrders(req: Request, res: Response) {
  try {
    const uid = req.user?.userId;
    if (!uid) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    const oid = new mongoose.Types.ObjectId(uid);

    const purchasePage = Math.max(
      1,
      Number.parseInt(String(req.query.purchasePage ?? "1"), 10) || 1,
    );
    const salePage = Math.max(
      1,
      Number.parseInt(String(req.query.salePage ?? "1"), 10) || 1,
    );
    const { limit, skip: _skip, totalPages } = parsePageLimit(req, {
      page: 1,
      limit: 20,
      maxLimit: 50,
    });

    const purchaseSkip = (purchasePage - 1) * limit;
    const saleSkip = (salePage - 1) * limit;

    const purchaseFilter = {
      customerId: oid,
      billingReason: { $in: [...LISTING_PURCHASE_BILLING_REASONS] },
    };
    const saleFilter = {
      sellerId: oid,
      billingReason: { $in: [...LISTING_PURCHASE_BILLING_REASONS] },
    };

    const [purchaseTx, saleTx, purchaseTotal, saleTotal] = await Promise.all([
      Transaction.find(purchaseFilter)
        .sort({ createdAt: -1 })
        .skip(purchaseSkip)
        .limit(limit)
        .lean(),
      Transaction.find(saleFilter)
        .sort({ createdAt: -1 })
        .skip(saleSkip)
        .limit(limit)
        .lean(),
      Transaction.countDocuments(purchaseFilter),
      Transaction.countDocuments(saleFilter),
    ]);

    const listingIdSet = new Set<string>();
    for (const t of purchaseTx) {
      listingIdSet.add(String(t.ListingId));
    }
    for (const t of saleTx) {
      listingIdSet.add(String(t.ListingId));
    }

    const listingIds = [...listingIdSet].filter((id) => mongoose.isValidObjectId(id));
    const listings =
      listingIds.length > 0
        ? await Listing.find({
            _id: { $in: listingIds.map((id) => new mongoose.Types.ObjectId(id)) },
          })
            .select("appName slug photos coverIndex status")
            .lean()
        : [];

    const byListingId = new Map(
      listings.map((l) => [String(l._id), l] as const),
    );

    const mapRow = (t: (typeof purchaseTx)[number], role: "buyer" | "seller") => {
      const lid = String(t.ListingId);
      const listing = byListingId.get(lid);
      const createdAt =
        "createdAt" in t && t.createdAt instanceof Date
          ? t.createdAt.toISOString()
          : new Date().toISOString();

      return {
        transactionId: String(t._id),
        role,
        listingId: lid,
        slug: listing?.slug ?? "",
        appName: listing?.appName ?? "Listing",
        coverUrl: pickCoverUrl(listing?.photos, listing?.coverIndex),
        amountCents: t.amountCharged,
        currency: (t.currency as string | undefined) ?? "usd",
        paymentStatus: (t.paymentStatus as string | undefined) ?? "pending",
        listingStatus: listing?.status as string | undefined,
        purchasedAt: createdAt,
      };
    };

    const purchases =
      purchaseTotal === 0
        ? paginatedEmpty(purchasePage, limit)
        : {
            items: purchaseTx.map((t) => mapRow(t, "buyer")),
            page: purchasePage,
            limit,
            total: purchaseTotal,
            totalPages: totalPages(purchaseTotal),
          };

    const sales =
      saleTotal === 0
        ? paginatedEmpty(salePage, limit)
        : {
            items: saleTx.map((t) => mapRow(t, "seller")),
            page: salePage,
            limit,
            total: saleTotal,
            totalPages: totalPages(saleTotal),
          };

    return void res.status(200).json({ purchases, sales });
  } catch (err) {
    console.error("getMyMarketplaceOrders error:", err);
    return void res.status(500).json({ message: "Failed to load marketplace orders" });
  }
}
