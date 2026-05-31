import type { Request, Response } from "express";
import mongoose from "mongoose";

import { io } from "../../app";
import { disputeRequiresReviewEmail } from "../../lib/email-notifications";
import { finalizeDisputeRefund } from "../../lib/finalize-dispute-refund";
import { processDisputeRefund } from "../../lib/process-dispute-refund";
import Listing from "../../models/listing";
import { serializeDispute } from "../../lib/serialize-dispute";
import { SocketEvents } from "../../lib/socket-events";
import Dispute from "../../models/disputes";
import Transaction from "../../models/transactions";

type Body = {
  action?: unknown;
  sellerResponse?: unknown;
};

/**
 * POST /api/disputes/:disputeId/respond
 * Seller accepts (Stripe refund) or escalates to platform review.
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

    if (dispute.disputeStatus !== "awaiting_seller_response") {
      return void res.status(400).json({
        message: "This dispute is not awaiting a seller response.",
        ok: false,
      });
    }

    if (action === "accept") {
      const transaction = await Transaction.findById(dispute.transactionId);
      if (!transaction) {
        return void res.status(404).json({
          message: "Transaction not found for this dispute.",
          ok: false,
        });
      }

      let refundResult;
      try {
        refundResult = await processDisputeRefund(dispute, transaction);
      } catch (refundErr) {
        const msg =
          refundErr instanceof Error
            ? refundErr.message
            : "Could not process refund.";
        console.error("respondToDispute refund:", refundErr);
        return void res.status(502).json({ message: msg, ok: false });
      }

      const refundCents = Number(dispute.requestedRefundAmount ?? dispute.amountPaid);
      const isPartial = refundCents < Number(dispute.amountPaid);

      dispute.sellerResponse =
        sellerResponse ||
        "Seller accepted the buyer's refund request. Refund is being processed.";
      dispute.disputeStatus = "closed";
      dispute.decision = "settled";
      dispute.action = isPartial ? "partial_refund" : "refund";
      await dispute.save();

      if (
        refundResult.mode === "canceled" ||
        refundResult.mode === "partial_capture"
      ) {
        await finalizeDisputeRefund(disputeId, isPartial);
      }

      io.to(String(dispute.userId)).emit(SocketEvents.DISPUTE_UPDATED, {
        message: "The seller accepted your dispute — refund processing",
        disputeId: String(dispute._id),
        disputeStatus: dispute.disputeStatus,
      });
      io.to(String(dispute.sellerId)).emit(SocketEvents.DISPUTE_UPDATED, {
        message: "You accepted the dispute refund request",
        disputeId: String(dispute._id),
        disputeStatus: dispute.disputeStatus,
      });

      return void res.status(200).json({
        ok: true,
        dispute: serializeDispute(dispute),
        refund: refundResult,
      });
    }

    dispute.sellerResponse = sellerResponse;
    dispute.disputeStatus = "in_review";
    dispute.action = "pending";
    await dispute.save();

    const listing = (await Listing.findById(dispute.listingId)
      .select("appName")
      .lean()) as { appName?: string } | null;
    const listingAppName = listing?.appName?.trim() || "Listing";
    const refundCents = Number(dispute.requestedRefundAmount ?? dispute.amountPaid);
    const desired =
      dispute.desiredAction === "partial_refund" ? "partial_refund" : "full_refund";

    await disputeRequiresReviewEmail(
      String(dispute._id),
      listingAppName,
      dispute.category,
      dispute.initiatorName,
      Number(dispute.amountPaid),
      refundCents,
      desired,
      sellerResponse,
    );

    io.to(String(dispute.userId)).emit(SocketEvents.DISPUTE_UPDATED, {
      message: "The seller escalated your dispute for platform review",
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
