import type { Request, Response } from "express";
import mongoose from "mongoose";

import Listing from "../../models/listing";
import Transaction from "../../models/transactions";

import { parsePageLimit } from "../../lib/parse-page-limit";

const PAYMENT_STATUSES = ["succeeded", "failed", "canceled", "pending"] as const;

function normalizePaymentStatus(raw: unknown): (typeof PAYMENT_STATUSES)[number] {
  const s = String(raw ?? "pending");
  return (PAYMENT_STATUSES as readonly string[]).includes(s)
    ? (s as (typeof PAYMENT_STATUSES)[number])
    : "pending";
}

/**
 * GET /api/listings/me/transactions
 * Paginated ledger: every transaction the user joined as buyer or seller.
 */
export async function getMyTransactions(req: Request, res: Response) {
  try {
    const uid = req.user?.userId;
    if (!uid) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    const oid = new mongoose.Types.ObjectId(uid);
    const { page, limit, skip, totalPages } = parsePageLimit(req, {
      page: 1,
      limit: 25,
      maxLimit: 100,
    });

    const filter = {
      $or: [{ customerId: oid }, { sellerId: oid }],
    };

    const [rows, total] = await Promise.all([
      Transaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Transaction.countDocuments(filter),
    ]);

    const listingIds = [
      ...new Set(
        rows
          .map((t) => String(t.ListingId))
          .filter((id) => mongoose.isValidObjectId(id)),
      ),
    ];

    const listings =
      listingIds.length > 0
        ? await Listing.find({
            _id: { $in: listingIds.map((id) => new mongoose.Types.ObjectId(id)) },
          })
            .select("appName slug")
            .lean()
        : [];

    const byListingId = new Map(listings.map((l) => [String(l._id), l] as const));

    const items = rows.map((t) => {
      const lid = String(t.ListingId);
      const listing = byListingId.get(lid);
      const createdAt =
        "createdAt" in t && t.createdAt instanceof Date
          ? t.createdAt.toISOString()
          : new Date().toISOString();
      const isBuyer = String(t.customerId) === uid;

      return {
        transactionId: String(t._id),
        role: isBuyer ? ("buyer" as const) : ("seller" as const),
        listingId: lid,
        appName: listing?.appName ?? "Listing",
        slug: listing?.slug ?? "",
        billingReason: String(t.billingReason ?? "").trim() || "Charge",
        paymentType: (t.paymentType as string | undefined) ?? "stripe",
        paymentStatus: normalizePaymentStatus(t.paymentStatus),
        serviceFee: Number(t.serviceFee ?? 0),
        amountPaid: Number(t.amountPaid ?? 0),
        amountCharged: Number(t.amountCharged ?? 0),
        paidOut: Boolean(t.paidOut),
        hasDispute: Boolean(t.hasDispute),
        escrowLastEvent: t.escrowLastEvent ?? null,
        escrowFundsSecured: Boolean(t.escrowFundsSecured),
        currency: String(t.currency ?? "usd"),
        createdAt,
      };
    });

    return void res.status(200).json({
      items,
      page,
      limit,
      total,
      totalPages: totalPages(total),
    });
  } catch (err) {
    console.error("getMyTransactions error:", err);
    return void res.status(500).json({ message: "Failed to load transactions" });
  }
}
