import type { Request, Response } from "express";
import mongoose from "mongoose";

import { io } from "../../app";
import { serializeDispute } from "../../lib/serialize-dispute";
import { SocketEvents } from "../../lib/socket-events";
import Dispute from "../../models/disputes";

type Body = {
  action?: unknown;
  sellerResponse?: unknown;
};

/**
 * POST /api/disputes/:disputeId/respond
 * Seller accepts the buyer request or responds and escalates to platform review.
 */
export async function respondToDispute(req: Request, res: Response) {
  const uid = req.user?.userId;
  if (!uid) {
    return void res.status(401).json({ message: "Unauthorized", ok: false });
  }

  const disputeId = String(req.params.disputeId ?? "").trim();
  if (!mongoose.isValidObjectId(disputeId)) {
    return void res.status(400).json({ message: "Invalid dispute id.", ok: false });
  }

  const body = (req.body ?? {}) as Body;
  const action = String(body.action ?? "").trim();
  const sellerResponse =
    typeof body.sellerResponse === "string" ? body.sellerResponse.trim() : "";

  if (action !== "accept" && action !== "escalate") {
    return void res.status(400).json({
      message: 'action must be "accept" or "escalate".',
      ok: false,
    });
  }

  if (action === "escalate" && sellerResponse.length < 10) {
    return void res.status(400).json({
      message: "Please provide a response (at least 10 characters) when escalating.",
      ok: false,
    });
  }

  try {
    const dispute = await Dispute.findById(disputeId);
    if (!dispute) {
      return void res.status(404).json({ message: "Dispute not found.", ok: false });
    }

    if (String(dispute.sellerId) !== uid) {
      return void res.status(403).json({
        message: "Only the seller can respond to this dispute.",
        ok: false,
      });
    }

    if (dispute.disputeStatus === "closed") {
      return void res.status(400).json({
        message: "This dispute is already closed.",
        ok: false,
      });
    }

    if (action === "accept") {
      dispute.sellerResponse =
        sellerResponse ||
        "Seller accepted the buyer refund request. Platform will process next steps.";
      dispute.disputeStatus = "in_review";
      dispute.action = "pending";
    } else {
      dispute.sellerResponse = sellerResponse;
      dispute.disputeStatus = "in_review";
      dispute.action = "pending";
    }

    await dispute.save();

    io.to(String(dispute.userId)).emit(SocketEvents.DISPUTE_UPDATED, {
      message: "The seller responded to your dispute",
      disputeId: String(dispute._id),
      disputeStatus: dispute.disputeStatus,
    });

    return void res.status(200).json({
      ok: true,
      dispute: serializeDispute(dispute),
    });
  } catch (err) {
    console.error("respondToDispute:", err);
    return void res.status(500).json({
      message: "Failed to save dispute response.",
      ok: false,
    });
  }
}
