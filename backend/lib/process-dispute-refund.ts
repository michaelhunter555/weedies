import type { IDisputes } from "../models/disputes";
import type { ITransaction } from "../models/transactions";
import stripe from "../utils/stripe";

export type DisputeRefundResult =
  | { mode: "canceled" }
  | { mode: "partial_capture"; refundCents: number }
  | { mode: "refund"; refundId: string; status: string };

function refundMetadata(
  dispute: IDisputes,
  isPartial: boolean,
): Record<string, string> {
  return {
    listingId: String(dispute.listingId),
    sellerId: String(dispute.sellerId),
    buyerId: String(dispute.userId),
    transactionId: String(dispute.transactionId),
    dispute_id: String(dispute._id),
    isDispute: "true",
    partialRefund: String(isPartial),
    paymentType: "asset-sale",
    reason: "Dispute refund",
  };
}

/**
 * Execute Stripe refund for a seller-accepted dispute (full or partial).
 * Uncaptured authorizations are canceled or partially captured; captured
 * charges use `refunds.create` with Connect reverse_transfer.
 */
export async function processDisputeRefund(
  dispute: IDisputes,
  transaction: ITransaction,
  opts?: { refundCents?: number },
): Promise<DisputeRefundResult> {
  const piId =
    dispute.stripePaymentIntentId?.trim() ||
    transaction.stripePaymentIntentId?.trim();
  if (!piId) {
    throw new Error("No payment found for this dispute.");
  }

  const amountPaid = Number(dispute.amountPaid ?? transaction.amountPaid ?? 0);
  const requested = Number(opts?.refundCents ?? dispute.requestedRefundAmount ?? 0);
  const refundCents = requested > 0 ? requested : amountPaid;
  if (!Number.isFinite(refundCents) || refundCents <= 0 || refundCents > amountPaid) {
    throw new Error("Invalid refund amount on dispute.");
  }

  const isPartial = refundCents < amountPaid;
  const meta = refundMetadata(dispute, isPartial);

  const pi = await stripe.paymentIntents.retrieve(piId);

  if (pi.status === "requires_capture") {
    if (!isPartial) {
      await stripe.paymentIntents.cancel(piId);
      return { mode: "canceled" };
    }
    const captureCents = amountPaid - refundCents;
    if (captureCents <= 0) {
      await stripe.paymentIntents.cancel(piId);
      return { mode: "canceled" };
    }
    await stripe.paymentIntents.capture(piId, {
      amount_to_capture: captureCents,
    });
    return { mode: "partial_capture", refundCents };
  }

  if (pi.status === "succeeded") {
    const refund = await stripe.refunds.create({
      payment_intent: piId,
      amount: refundCents,
      metadata: meta,
      reverse_transfer: true,
      refund_application_fee: !isPartial,
    });
    return { mode: "refund", refundId: refund.id, status: refund.status ?? "pending" };
  }

  if (pi.status === "canceled") {
    throw new Error("Payment was already canceled.");
  }

  throw new Error(
    `Refund cannot be processed while payment is ${pi.status ?? "unknown"}.`,
  );
}
