import type { Request, Response } from "express";
import mongoose from "mongoose";

import { serializeDispute } from "../../lib/serialize-dispute";
import Dispute from "../../models/disputes";

/**
 * GET /api/disputes?userId=&page=&limit=&order=&queryValue=&status=
 */
export async function getDisputes(req: Request, res: Response) {
  const uid = req.user?.userId;
  if (!uid) {
    return void res.status(401).json({ message: "Unauthorized", ok: false });
  }

  const { userId, page, limit, order, queryValue, status } = req.query;
  if (userId && String(userId) !== uid) {
    return void res.status(403).json({ message: "Forbidden", ok: false });
  }

  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum = Math.min(Math.max(parseInt(String(limit), 10) || 12, 1), 50);
  const orderNum = Number(order) === -1 ? -1 : 1;
  const oid = new mongoose.Types.ObjectId(uid);

  const disputeQuery: Record<string, unknown> = {
    $or: [{ userId: oid }, { sellerId: oid }],
    ...(status && String(status).length > 0
      ? { disputeStatus: String(status) }
      : {}),
  };

  if (queryValue && String(queryValue) !== "undefined") {
    const q = String(queryValue).trim();
    const orConditions: Record<string, unknown>[] = [
      { initiatorName: { $regex: q, $options: "i" } },
      { category: { $regex: q, $options: "i" } },
      { disputeStatus: { $regex: q, $options: "i" } },
      { sellerName: { $regex: q, $options: "i" } },
    ];
    if (mongoose.isValidObjectId(q)) {
      orConditions.push({ _id: new mongoose.Types.ObjectId(q) });
    }
    disputeQuery.$and = [{ $or: orConditions }];
  }

  try {
    const [disputes, totalDisputes] = await Promise.all([
      Dispute.find(disputeQuery)
        .sort({ createdAt: orderNum })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Dispute.countDocuments(disputeQuery),
    ]);

    return void res.status(200).json({
      ok: true,
      disputes: disputes.map((d) => serializeDispute(d)),
      page: pageNum,
      limit: limitNum,
      totalPages: Math.max(1, Math.ceil(totalDisputes / limitNum)),
      totalDisputes,
    });
  } catch (err) {
    console.error("getDisputes:", err);
    return void res.status(500).json({
      message: "Failed to load disputes.",
      ok: false,
    });
  }
}
