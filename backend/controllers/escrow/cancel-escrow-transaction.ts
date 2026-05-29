import type { Request, Response } from "express";

import {
  cancelEscrowTransaction as cancelEscrowTransactionApi,
  EscrowApiError,
  getEscrowTransaction as getEscrowTransactionApi,
  isEscrowApiConfigured,
} from "../../lib/escrow-api";
import {
  canCancelEscrowTransaction,
  escrowFundsSecured,
  escrowTransactionBuyerSeller,
} from "../../lib/escrow-reconcile";
import { cancelEscrowListingPurchase } from "../../lib/escrow-purchase-finalize";
import Transaction from "../../models/transactions";

function cancelBlockedMessage(
  escrowTx: Awaited<ReturnType<typeof getEscrowTransactionApi>>,
): string {
  if (escrowTx.is_cancelled) {
    return "This Escrow transaction is already cancelled.";
  }
  const { buyer, seller } = escrowTransactionBuyerSeller(escrowTx);
  if (buyer?.agreed && seller?.agreed) {
    return "Both parties have already agreed on Escrow.com.";
  }
  if (escrowFundsSecured(escrowTx)) {
    return "Funds are already secured on Escrow.com.";
  }
  return "This Escrow transaction can no longer be cancelled.";
}

/**
 * POST /api/escrow/transaction/cancel
 * Body: `{ escrowTransactionId: string, cancellationReason?: string }`
 */
export async function cancelEscrowTransaction(req: Request, res: Response) {
  const uid = req.user?.userId;
  if (!uid) {
    return void res.status(401).json({ ok: false, message: "Unauthorized" });
  }

  if (!isEscrowApiConfigured()) {
    return void res.status(503).json({
      ok: false,
      message: "Escrow is not configured on the server.",
    });
  }

  const escrowTransactionId = String(
    (req.body as { escrowTransactionId?: unknown })?.escrowTransactionId ?? "",
  ).trim();
  if (!escrowTransactionId) {
    return void res.status(400).json({
      ok: false,
      message: "escrowTransactionId is required",
    });
  }

  const cancellationReasonRaw = (req.body as { cancellationReason?: unknown })
    ?.cancellationReason;
  const cancellationReason =
    typeof cancellationReasonRaw === "string" ? cancellationReasonRaw.trim() : "";

  try {
    const localTx = await Transaction.findOne({
      escrowTransactionId,
      paymentType: "escrow",
    });

    if (!localTx) {
      return void res.status(404).json({ ok: false, message: "Transaction not found" });
    }

    const isParty =
      String(localTx.customerId) === uid || String(localTx.sellerId) === uid;
    if (!isParty) {
      return void res.status(403).json({ ok: false, message: "Forbidden" });
    }

    if (localTx.paymentStatus === "canceled") {
      return void res.status(200).json({
        ok: true,
        escrowTransactionId,
        is_cancelled: true,
        paymentStatus: "canceled",
        listingId: String(localTx.ListingId),
      });
    }

    if (localTx.paymentStatus === "succeeded") {
      return void res.status(409).json({
        ok: false,
        message: "This Escrow transaction already has secured funds and cannot be cancelled here.",
      });
    }

    const escrowBefore = await getEscrowTransactionApi(escrowTransactionId);

    if (!canCancelEscrowTransaction(escrowBefore)) {
      return void res.status(409).json({
        ok: false,
        message: cancelBlockedMessage(escrowBefore),
      });
    }

    await cancelEscrowTransactionApi(
      escrowTransactionId,
      cancellationReason || undefined,
    );

    const escrowAfter = await getEscrowTransactionApi(escrowTransactionId);
    const confirmed = escrowAfter.is_cancelled === true;

    if (confirmed) {
      await cancelEscrowListingPurchase(escrowTransactionId);
    }

    return void res.status(200).json({
      ok: true,
      escrowTransactionId,
      is_cancelled: confirmed,
      paymentStatus: confirmed ? "canceled" : localTx.paymentStatus,
      listingId: String(localTx.ListingId),
    });
  } catch (err) {
    console.error("cancelEscrowTransaction:", err);
    if (err instanceof EscrowApiError) {
      return void res.status(err.status >= 400 && err.status < 600 ? err.status : 502).json({
        ok: false,
        message: err.message,
        details: err.body,
      });
    }
    return void res.status(500).json({
      ok: false,
      message: "Failed to cancel Escrow transaction",
    });
  }
}
