import type { Request, Response } from "express";
import mongoose from "mongoose";

import { parsePageLimit } from "../../lib/parse-page-limit";
import PayoutBatch from "../../models/payoutBatch";

type PayoutBatchLean = {
  _id: unknown;
  amount: number;
  status: string;
  stripePayoutId?: string | null;
  payoutDate?: Date | null;
  currency?: string | null;
  transactions?: unknown[];
  createdAt?: Date;
  updatedAt?: Date;
};

function serializeBatch(row: PayoutBatchLean) {
  const currency = String(row.currency ?? "usd").toUpperCase();
  const amountCents = Number(row.amount ?? 0);
  return {
    _id: String(row._id ?? ""),
    status: row.status,
    /** Major units (e.g. dollars). */
    amount: amountCents / 100,
    amountCents,
    currency,
    stripePayoutId: row.stripePayoutId ?? null,
    payoutDate: row.payoutDate ? new Date(row.payoutDate).toISOString() : null,
    transactionCount: Array.isArray(row.transactions) ? row.transactions.length : 0,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
  };
}

/**
 * GET /api/stripe/payout-batches?page=1&limit=10
 *
 * Paginated payout history for the authenticated seller (`PayoutBatch` records).
 */
export async function getPayoutBatches(req: Request, res: Response) {
  const userId = req.user?.userId;
  if (!userId) {
    return void res.status(401).json({ message: "Unauthorized", ok: false });
  }

  if (!mongoose.isValidObjectId(userId)) {
    return void res.status(400).json({ message: "Invalid user id.", ok: false });
  }

  const { page, limit, skip, totalPages } = parsePageLimit(req, {
    page: 1,
    limit: 10,
    maxLimit: 10,
  });

  try {
    const sellerOid = new mongoose.Types.ObjectId(userId);
    const filter = { sellerId: sellerOid };

    const [rows, total] = await Promise.all([
      PayoutBatch.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select(
          "amount status stripePayoutId payoutDate currency transactions createdAt updatedAt",
        )
        .lean(),
      PayoutBatch.countDocuments(filter),
    ]);

    const items = (rows as unknown as PayoutBatchLean[]).map(serializeBatch);

    return void res.status(200).json({
      ok: true,
      items,
      page,
      limit,
      total,
      totalPages: totalPages(total),
    });
  } catch (err) {
    console.error("getPayoutBatches:", err);
    return void res
      .status(500)
      .json({ ok: false, message: "Failed to load payout history." });
  }
}
