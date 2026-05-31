import type { Request, Response } from "express";
import mongoose from "mongoose";

import { io } from "../../../app";
import { adminDisputeDecisionEmail } from "../../../lib/email-notifications";
import { processDisputeRefund } from "../../../lib/process-dispute-refund";
import { SocketEvents } from "../../../lib/socket-events";
import { checkRoom } from "../../../utils/check-socket-room";
import Dispute from "../../../models/disputes";
import Listing from "../../../models/listing";
import ListingExchange from "../../../models/exchange";
import Transaction from "../../../models/transactions";
import User from "../../../models/user";

type PlatformDecision = "in_favor_user" | "in_favor_seller";

function decisionSummary(decision: PlatformDecision): string {
  return decision === "in_favor_user"
    ? "Resolved in the buyer's favor"
    : "Resolved in the seller's favor";
}

function refundCentsForBuyerWin(dispute: {
  amountPaid: number;
  desiredAction?: string;
  requestedRefundAmount?: number;
}): number {
  const amountPaid = Number(dispute.amountPaid) || 0;
  if (dispute.desiredAction === "partial_refund") {
    const partial = Number(dispute.requestedRefundAmount) || 0;
    if (partial > 0 && partial <= amountPaid) return partial;
  }
  return amountPaid;
}

/**
 * PATCH /api/admin/disputes/:disputeId/decision
 * Body: { decision: "in_favor_user" | "in_favor_seller", platformResponse: string }
 */
export async function adminDisputeDecision(req: Request, res: Response) {
  const rawId = req.params.disputeId;
  const disputeId = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!disputeId || !mongoose.isValidObjectId(disputeId)) {
    return void res.status(400).json({
      message: "Invalid dispute id",
      ok: false,
    });
  }

  const decision = String(req.body?.decision ?? "").trim() as PlatformDecision;
  const platformResponse =
    typeof req.body?.platformResponse === "string"
      ? req.body.platformResponse.trim()
      : "";
  const refundAmountCentsRaw = Number(req.body?.refundAmountCents);

  if (decision !== "in_favor_user" && decision !== "in_favor_seller") {
    return void res.status(400).json({
      message: 'decision must be "in_favor_user" or "in_favor_seller".',
      ok: false,
    });
  }

  if (platformResponse.length < 10) {
    return void res.status(400).json({
      message: "platformResponse must be at least 10 characters.",
      ok: false,
    });
  }

  try {
    const dispute = await Dispute.findById(disputeId);
    if (!dispute) {
      return void res.status(404).json({ message: "Dispute not found", ok: false });
    }

    if (dispute.disputeStatus === "closed") {
      return void res.status(400).json({
        message: "This dispute is already closed.",
        ok: false,
      });
    }

    const transaction = await Transaction.findById(dispute.transactionId);
    if (!transaction) {
      return void res.status(404).json({ message: "Transaction not found", ok: false });
    }

    const piId = transaction.stripePaymentIntentId?.trim();
    if (!piId) {
      return void res.status(400).json({
        message: "No Stripe payment on this transaction.",
        ok: false,
      });
    }

    const [seller, buyer, listing] = await Promise.all([
      User.findById(transaction.sellerId).select("email name"),
      User.findById(transaction.customerId).select("email name"),
      Listing.findById(transaction.ListingId)
        .select("appName")
        .lean() as Promise<{ appName?: string } | null>,
    ]);

    if (!seller?.email || !buyer?.email) {
      return void res.status(404).json({ message: "Buyer or seller not found", ok: false });
    }

    const listingAppName = listing?.appName?.trim() || "Listing";
    const amountPaid = Number(dispute.amountPaid ?? transaction.amountPaid ?? 0);
    let refundAction: "refund" | "partial_refund" | "none" = "none";

    if (decision === "in_favor_user") {
      let refundCents = refundCentsForBuyerWin(dispute);
      if (Number.isFinite(refundAmountCentsRaw) && refundAmountCentsRaw > 0) {
        refundCents = Math.round(refundAmountCentsRaw);
      }
      if (refundCents <= 0 || refundCents > amountPaid) {
        return void res.status(400).json({
          message: `Refund must be between 1 cent and ${amountPaid} cents (amount paid).`,
          ok: false,
        });
      }
      if (refundCents % 100 !== 0) {
        return void res.status(400).json({
          message: "Refund amount must be a whole-dollar value.",
          ok: false,
        });
      }

      const isPartial = refundCents < amountPaid;
      refundAction = isPartial ? "partial_refund" : "refund";

      try {
        const refundResult = await processDisputeRefund(dispute, transaction, {
          refundCents,
        });

        if (
          refundResult.mode === "canceled" ||
          refundResult.mode === "partial_capture"
        ) {
          await ListingExchange.updateOne(
            { listingId: dispute.listingId },
            {
              $set: {
                paymentStatus: isPartial ? "succeeded" : "canceled",
              },
            },
          );
        }
      } catch (refundErr) {
        const msg =
          refundErr instanceof Error ? refundErr.message : "Refund failed.";
        console.error("adminDisputeDecision refund:", refundErr);
        return void res.status(502).json({ message: msg, ok: false });
      }

      transaction.hasDispute = false;
      transaction.amountPaid = isPartial
        ? Math.max(0, amountPaid - refundCents)
        : 0;
      dispute.action = refundAction;
    } else {
      // Seller wins: release hold for payout; no Stripe refund.
      transaction.hasDispute = false;
      dispute.action = "none";
      refundAction = "none";
    }

    dispute.disputeStatus = "closed";
    dispute.decision = decision;
    dispute.platformResponse = platformResponse;

    await dispute.save();
    await transaction.save();

    const summary = decisionSummary(decision);
    const socketPayload = {
      message: summary,
      disputeId: String(dispute._id),
      disputeStatus: dispute.disputeStatus,
      decision,
    };

    if (checkRoom(io, String(transaction.sellerId))) {
      io.to(String(transaction.sellerId)).emit(
        SocketEvents.DISPUTE_RESOLVED,
        socketPayload,
      );
    }
    if (checkRoom(io, String(transaction.customerId))) {
      io.to(String(transaction.customerId)).emit(
        SocketEvents.DISPUTE_RESOLVED,
        socketPayload,
      );
    }

    await adminDisputeDecisionEmail(
      String(seller.email),
      String(seller.name ?? "Seller"),
      String(seller._id),
      String(dispute._id),
      listingAppName,
      summary,
      refundAction,
      platformResponse,
    );
    await adminDisputeDecisionEmail(
      String(buyer.email),
      String(buyer.name ?? "Buyer"),
      String(buyer._id),
      String(dispute._id),
      listingAppName,
      summary,
      refundAction,
      platformResponse,
    );

    return void res.status(200).json({
      ok: true,
      message: "Dispute closed",
      dispute: {
        id: String(dispute._id),
        disputeStatus: dispute.disputeStatus,
        decision: dispute.decision,
        action: dispute.action,
      },
    });
  } catch (err) {
    console.error("adminDisputeDecision:", err);
    return void res.status(500).json({
      message: "Failed to close dispute",
      ok: false,
    });
  }
}

export default adminDisputeDecision;
