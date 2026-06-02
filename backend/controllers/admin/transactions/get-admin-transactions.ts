import type { Request, Response } from "express";
import mongoose from "mongoose";
import Transaction from "../../../models/transactions";
import Listing from "../../../models/listing";
import User from "../../../models/user";

const PAYMENT_STATUSES = new Set([
  "succeeded",
  "failed",
  "canceled",
  "pending",
]);
const PAYMENT_TYPES = new Set(["stripe", "escrow"]);
const DATE_RANGES = new Set([7, 14, 30]);
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

function parsePageLimit(req: Request) {
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);
  const rawLimit =
    Number.parseInt(String(req.query.limit ?? String(DEFAULT_LIMIT)), 10) ||
    DEFAULT_LIMIT;
  const limit = Math.min(MAX_LIMIT, Math.max(1, rawLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function parseBoolQuery(value: unknown): boolean | undefined {
  if (value === "true" || value === true) return true;
  if (value === "false" || value === false) return false;
  return undefined;
}

function buildTransactionFilter(req: Request): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  const idRaw =
    typeof req.query.id === "string"
      ? req.query.id.trim()
      : typeof req.query._id === "string"
        ? req.query._id.trim()
        : "";
  if (idRaw) {
    if (mongoose.Types.ObjectId.isValid(idRaw)) {
      filter._id = new mongoose.Types.ObjectId(idRaw);
    } else {
      filter._id = { $exists: false };
    }
  }

  const status =
    typeof req.query.status === "string" ? req.query.status.trim() : "";
  if (status && PAYMENT_STATUSES.has(status)) {
    filter.paymentStatus = status;
  }

  const paymentType =
    typeof req.query.paymentType === "string"
      ? req.query.paymentType.trim()
      : "";
  if (paymentType && PAYMENT_TYPES.has(paymentType)) {
    filter.paymentType = paymentType;
  }

  const hasDispute = parseBoolQuery(req.query.hasDispute);
  if (hasDispute === true) filter.hasDispute = true;
  if (hasDispute === false) filter.hasDispute = { $ne: true };

  const paidOut = parseBoolQuery(req.query.paidOut);
  if (paidOut === true) filter.paidOut = true;
  if (paidOut === false) filter.paidOut = { $ne: true };

  const days = Number.parseInt(String(req.query.days ?? ""), 10);
  if (DATE_RANGES.has(days)) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    filter.createdAt = { $gte: since };
  }

  return filter;
}

type LeanTx = {
  _id: mongoose.Types.ObjectId;
  ListingId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  amountCharged: number;
  amountPaid: number;
  serviceFee: number;
  paymentStatus?: string;
  billingReason?: string;
  hasDispute?: boolean;
  paidOut?: boolean;
  payoutDate?: Date;
  paymentType?: string;
  stripePaymentIntentId?: string;
  escrowTransactionId?: string;
  escrowFundsSecured?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

/**
 * GET /api/admin/transactions
 * Query: page, limit (default 10), id|_id, status, paymentType, hasDispute, paidOut, days (7|14|30)
 */
export async function getAdminTransactions(req: Request, res: Response) {
  try {
    const { page, limit, skip } = parsePageLimit(req);
    const filter = buildTransactionFilter(req);

    const [rows, total, agg] = await Promise.all([
      Transaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<LeanTx[]>(),
      Transaction.countDocuments(filter),
      Transaction.aggregate<{
        totalSales: number;
        totalServiceFee: number;
        transactionCount: number;
      }>([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalSales: { $sum: { $ifNull: ["$amountPaid", 0] } },
            totalServiceFee: { $sum: { $ifNull: ["$serviceFee", 0] } },
            transactionCount: { $sum: 1 },
          },
        },
      ]),
    ]);

    const listingIds = [
      ...new Set(rows.map((t) => String(t.ListingId))),
    ];
    const userIds = [
      ...new Set(
        rows.flatMap((t) => [String(t.customerId), String(t.sellerId)]),
      ),
    ];

    const [listings, users] = await Promise.all([
      Listing.find({ _id: { $in: listingIds } })
        .select("appName slug status")
        .lean(),
      User.find({ _id: { $in: userIds } })
        .select("name email")
        .lean(),
    ]);

    const listingById = new Map(listings.map((l) => [String(l._id), l]));
    const userById = new Map(users.map((u) => [String(u._id), u]));

    const items = rows.map((t) => {
      const listing = listingById.get(String(t.ListingId));
      const buyer = userById.get(String(t.customerId));
      const seller = userById.get(String(t.sellerId));
      return {
        id: String(t._id),
        listingId: String(t.ListingId),
        listingAppName: listing?.appName ?? "Listing",
        listingSlug: listing?.slug ?? "",
        listingStatus: listing?.status ?? "",
        customerId: String(t.customerId),
        customerName: buyer?.name ?? "Buyer",
        customerEmail: buyer?.email ?? "",
        sellerId: String(t.sellerId),
        sellerName: seller?.name ?? "Seller",
        sellerEmail: seller?.email ?? "",
        amountCharged: t.amountCharged,
        amountPaid: t.amountPaid,
        serviceFee: t.serviceFee,
        paymentStatus: t.paymentStatus ?? "",
        billingReason: t.billingReason ?? "",
        hasDispute: Boolean(t.hasDispute),
        paidOut: Boolean(t.paidOut),
        payoutDate: t.payoutDate ?? null,
        paymentType: t.paymentType ?? "stripe",
        stripePaymentIntentId: t.stripePaymentIntentId ?? "",
        escrowTransactionId: t.escrowTransactionId ?? "",
        escrowFundsSecured: Boolean(t.escrowFundsSecured),
        createdAt: t.createdAt ?? null,
        updatedAt: t.updatedAt ?? null,
      };
    });

    const summary = agg[0] ?? {
      totalSales: 0,
      totalServiceFee: 0,
      transactionCount: 0,
    };

    return void res.json({
      ok: true,
      items,
      total,
      page,
      limit,
      summary: {
        totalSales: summary.totalSales,
        totalServiceFee: summary.totalServiceFee,
        transactionCount: summary.transactionCount,
      },
    });
  } catch (err) {
    console.error("getAdminTransactions:", err);
    return void res.status(500).json({ message: "Failed to load transactions" });
  }
}
