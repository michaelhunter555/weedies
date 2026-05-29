import type { Request, Response } from "express";

import {
  EscrowApiError,
  getEscrowTransaction as getEscrowTransactionApi,
  isEscrowApiConfigured,
  resolveBuyerEscrowAgreeUrl,
} from "../../lib/escrow-api";
import {
  canCancelEscrowTransaction,
  escrowFundsSecured,
  escrowTransactionBuyerSeller,
} from "../../lib/escrow-reconcile";
import Transaction, { type ITransaction } from "../../models/transactions";
import User from "../../models/user";

function partyJson(party: { customer: string; agreed: boolean; role: string } | null) {
  if (!party) return null;
  return {
    email: party.customer,
    agreed: Boolean(party.agreed),
    role: party.role,
  };
}

/**
 * GET /api/escrow/transaction/:escrowTransactionId
 * Escrow.com state + local payment row (buyer/seller parties only).
 */
export async function getEscrowTransactionStatus(req: Request, res: Response) {
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

  const escrowTransactionId = String(req.params.escrowTransactionId ?? "").trim();
  if (!escrowTransactionId) {
    return void res.status(400).json({ ok: false, message: "Missing escrow transaction id" });
  }

  const localTx = (await Transaction.findOne({
    escrowTransactionId,
    paymentType: "escrow",
  }).lean()) as ITransaction | null;

  if (!localTx) {
    return void res.status(404).json({ ok: false, message: "Transaction not found" });
  }

  const isParty =
    String(localTx.customerId) === uid || String(localTx.sellerId) === uid;
  if (!isParty) {
    return void res.status(403).json({ ok: false, message: "Forbidden" });
  }

  try {
    let agreeUrl: string | null = null;
    if (String(localTx.customerId) === uid) {
      const buyerUser = await User.findById(localTx.customerId)
        .select("email")
        .lean<{ email: string }>();
      const buyerEmail = buyerUser?.email?.trim().toLowerCase();
      if (buyerEmail) {
        agreeUrl = await resolveBuyerEscrowAgreeUrl(escrowTransactionId, buyerEmail);
      }
    }

    const escrowTx = await getEscrowTransactionApi(escrowTransactionId);
    const { buyer, seller } = escrowTransactionBuyerSeller(escrowTx);
    const fundsSecured = escrowFundsSecured(escrowTx);
    const isCancelled = escrowTx.is_cancelled === true;
    const canCancel =
      localTx.paymentStatus === "pending" &&
      !isCancelled &&
      canCancelEscrowTransaction(escrowTx);

    return void res.status(200).json({
      ok: true,
      escrowTransactionId,
      listingId: String(localTx.ListingId),
      paymentStatus: localTx.paymentStatus,
      agreeUrl,
      is_cancelled: isCancelled,
      close_date: escrowTx.close_date ?? null,
      creation_date: escrowTx.creation_date ?? null,
      fundsSecured,
      canCancel,
      buyer: partyJson(buyer),
      seller: partyJson(seller),
    });
  } catch (err) {
    console.error("getEscrowTransactionStatus:", err);
    if (err instanceof EscrowApiError) {
      return void res.status(err.status).json({
        ok: false,
        message: err.message,
        details: err.body,
      });
    }
    return void res.status(500).json({ ok: false, message: "Failed to load Escrow transaction" });
  }
}
