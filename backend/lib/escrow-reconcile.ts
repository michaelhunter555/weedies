import type { EscrowTransactionResponse } from "./escrow-api";
import { getEscrowTransaction } from "./escrow-api";
import {
  cancelEscrowListingPurchase,
  finalizeEscrowListingPurchase,
} from "./escrow-purchase-finalize";
import { platformApplicationFeeCents } from "./listing-asset-sale-fee";
import Transaction from "../models/transactions";

/** Escrow marks the buyer schedule row secured once funds are in escrow. */
export function escrowFundsSecured(escrowTx: EscrowTransactionResponse): boolean {
  const schedule = escrowTx.items?.[0]?.schedule?.[0];
  return schedule?.status?.secured === true;
}

export function escrowItemCanceled(escrowTx: EscrowTransactionResponse): boolean {
  return Boolean(escrowTx.items?.[0]?.status?.canceled);
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
): Promise<"funded" | "canceled" | "unchanged"> {
  const localTx = await Transaction.findOne({
    escrowTransactionId: String(escrowTransactionId),
    paymentType: "escrow",
  });
  if (!localTx?.ListingId) return "unchanged";

  const escrowTx = await getEscrowTransaction(escrowTransactionId);

  if (escrowItemCanceled(escrowTx)) {
    if (localTx.paymentStatus !== "canceled") {
      await cancelEscrowListingPurchase(escrowTransactionId);
    }
    return "canceled";
  }

  if (!escrowFundsSecured(escrowTx)) {
    return "unchanged";
  }

  if (localTx.paymentStatus === "succeeded") {
    return "unchanged";
  }

  const amountCents = Number(localTx.amountPaid ?? localTx.amountCharged ?? 0);
  const priceDollars = amountCents / 100;
  const serviceFeeCents =
    Number(localTx.serviceFee) || platformApplicationFeeCents(priceDollars);

  await finalizeEscrowListingPurchase({
    listingId: String(localTx.ListingId),
    buyerId: String(localTx.customerId),
    sellerId: String(localTx.sellerId),
    escrowTransactionId,
    amountCents,
    serviceFeeCents,
    currency: localTx.currency || escrowTx.currency || "usd",
    paymentStatus: "succeeded",
  });

  return "funded";
}
