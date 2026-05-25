import type { Request, Response } from "express";
import mongoose from "mongoose";

import Listing from "../../models/listing";
import Transaction from "../../models/transactions";

const LISTING_PURCHASE = "Listing purchase";

function pickCoverUrl(
  photos: string[] | undefined,
  coverIndex: number | undefined,
): string | null {
  const list = photos ?? [];
  if (!list.length) return null;
  const idx = Math.min(Math.max(0, coverIndex ?? 0), list.length - 1);
  return list[idx] ?? null;
}

export async function getMyMarketplaceOrders(req: Request, res: Response) {
  try {
    const uid = req.user?.userId;
    if (!uid) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    const oid = new mongoose.Types.ObjectId(uid);

    const [purchaseTx, saleTx] = await Promise.all([
      Transaction.find({
        customerId: oid,
        billingReason: LISTING_PURCHASE,
      })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
      Transaction.find({
        sellerId: oid,
        billingReason: LISTING_PURCHASE,
      })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
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

    return void res.status(200).json({
      purchases: purchaseTx.map((t) => mapRow(t, "buyer")),
      sales: saleTx.map((t) => mapRow(t, "seller")),
    });
  } catch (err) {
    console.error("getMyMarketplaceOrders error:", err);
    return void res.status(500).json({ message: "Failed to load marketplace orders" });
  }
}
