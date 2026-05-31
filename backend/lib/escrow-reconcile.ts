import type { EscrowTransactionResponse } from "./escrow-api";
import { getEscrowTransaction } from "./escrow-api";
import { syncEscrowTransactionFromWebhook } from "./escrow-webhook-sync";
import Transaction from "../models/transactions";

/** Escrow marks the buyer schedule row secured once funds are in escrow. */
export function escrowFundsSecured(escrowTx: EscrowTransactionResponse): boolean {
  const schedule = escrowTx.items?.[0]?.schedule?.[0];
  return schedule?.status?.secured === true;
}

export function escrowItemCanceled(escrowTx: EscrowTransactionResponse): boolean {
  return Boolean(escrowTx.items?.[0]?.status?.canceled);
}

export function escrowItemShipped(escrowTx: EscrowTransactionResponse): boolean {
  return Boolean(escrowTx.items?.[0]?.status?.shipped);
}

export function escrowItemReceived(escrowTx: EscrowTransactionResponse): boolean {
  return Boolean(escrowTx.items?.[0]?.status?.received);
}

/** Buyer accepted merchandise on Escrow.com (inspection complete there). */
export function escrowItemAccepted(escrowTx: EscrowTransactionResponse): boolean {
  return Boolean(escrowTx.items?.[0]?.status?.accepted);
}

export function escrowProgressFromApi(escrowTx: EscrowTransactionResponse) {
  return {
    fundsSecured: escrowFundsSecured(escrowTx),
    shipped: escrowItemShipped(escrowTx),
    received: escrowItemReceived(escrowTx),
    accepted: escrowItemAccepted(escrowTx),
    isCancelled: escrowTx.is_cancelled === true,
    closeDate: escrowTx.close_date ?? null,
  };
}

export function escrowTransactionBuyerSeller(escrowTx: EscrowTransactionResponse): {
  buyer: EscrowTransactionResponse["parties"][number] | null;
  seller: EscrowTransactionResponse["parties"][number] | null;
} {
  const parties = (escrowTx.parties ?? []).filter(
    (p) => p.role === "buyer" || p.role === "seller",
  );
  return {
    buyer: parties.find((p) => p.role === "buyer") ?? null,
    seller: parties.find((p) => p.role === "seller") ?? null,
  };
}

/** Escrow.com allows cancel until both buyer and seller have agreed and funds are not secured. */
export function canCancelEscrowTransaction(escrowTx: EscrowTransactionResponse): boolean {
  if (escrowTx.is_cancelled === true) return false;
  const { buyer, seller } = escrowTransactionBuyerSeller(escrowTx);
  if (!buyer || !seller) return false;
  if (buyer.agreed && seller.agreed) return false;
  if (escrowFundsSecured(escrowTx)) return false;
  return true;
}

/**
 * Align Mongo listing / transaction / exchange with Escrow.com when webhooks were missed.
 * Safe to call on every exchange load for pending escrow sales.
 */
export async function reconcileEscrowPaymentFromApi(
  escrowTransactionId: string,
): Promise<"funded" | "canceled" | "unchanged" | "payment_updated" | "recorded"> {
  const localTx = await Transaction.findOne({
    escrowTransactionId: String(escrowTransactionId),
    paymentType: "escrow",
  });
  if (!localTx?.ListingId) return "unchanged";

  const escrowTx = await getEscrowTransaction(escrowTransactionId);
  const action = await syncEscrowTransactionFromWebhook(
    localTx,
    escrowTx,
    "reconcile",
  );

  if (action === "funded") return "funded";
  if (action === "canceled") return "canceled";
  if (action === "payment_updated") return "payment_updated";
  return "unchanged";
}
