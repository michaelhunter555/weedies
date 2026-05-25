import type { Request, Response } from "express";
import mongoose from "mongoose";

import Listing from "../../models/listing";
import Transaction from "../../models/transactions";

const BILLING_PAYMENT_STATUSES = [
  "succeeded",
  "failed",
  "canceled",
  "pending",
] as const;

type BillingPaymentStatus = (typeof BILLING_PAYMENT_STATUSES)[number];

function normalizePaymentStatus(raw: unknown): BillingPaymentStatus {
  const s = String(raw ?? "pending");
  return (BILLING_PAYMENT_STATUSES as readonly string[]).includes(s)
    ? (s as BillingPaymentStatus)
    : "pending";
}

function pickCoverUrl(
  photos: string[] | undefined,
  coverIndex: number | undefined,
): string | null {
  const list = photos ?? [];
  if (!list.length) return null;
  const idx = Math.min(Math.max(0, coverIndex ?? 0), list.length - 1);
  return list[idx] ?? null;
}

/**
 * GET /api/stripe/billing-history
 * All charges on the user's Stripe customer (listing fees, app purchases, etc.).
 */
export async function getBillingHistory(req: Request, res: Response) {
  try {
    const uid = req.user?.userId;
    if (!uid) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    const oid = new mongoose.Types.ObjectId(uid);
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);

    const transactions = await Transaction.find({ customerId: oid })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const listingIds = [
      ...new Set(
        transactions
          .map((t) => String(t.ListingId))
          .filter((id) => mongoose.isValidObjectId(id)),
      ),
    ];

    const listings =
      listingIds.length > 0
        ? await Listing.find({
            _id: { $in: listingIds.map((id) => new mongoose.Types.ObjectId(id)) },
          })
            .select("appName slug photos coverIndex")
            .lean()
        : [];

    const byListingId = new Map(listings.map((l) => [String(l._id), l] as const));

    const items = transactions.map((t) => {
      const lid = String(t.ListingId);
      const listing = byListingId.get(lid);
      const createdAt =
        "createdAt" in t && t.createdAt instanceof Date
          ? t.createdAt.toISOString()
          : new Date().toISOString();

      return {
        transactionId: String(t._id),
        listingId: lid,
        slug: listing?.slug ?? "",
        appName: listing?.appName ?? "Listing",
        coverUrl: pickCoverUrl(listing?.photos, listing?.coverIndex),
        billingReason: String(t.billingReason ?? "Charge"),
        amountCents: Number(t.amountCharged ?? t.amountPaid ?? 0),
        currency: String(t.currency ?? "usd"),
        paymentStatus: normalizePaymentStatus(t.paymentStatus),
        purchasedAt: createdAt,
      };
    });

    return void res.status(200).json({ ok: true, items });
  } catch (err) {
    console.error("getBillingHistory error:", err);
    return void res.status(500).json({ message: "Failed to load billing history" });
  }
}
