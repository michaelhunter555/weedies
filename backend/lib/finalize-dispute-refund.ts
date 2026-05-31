import mongoose from "mongoose";

import Dispute from "../models/disputes";
import ListingExchange from "../models/exchange";
import Transaction from "../models/transactions";

/**
 * Close dispute and clear transaction flags after seller-accepted refund.
 * Safe to call again from webhooks (idempotent fields).
 */
export async function finalizeDisputeRefund(
  disputeId: string,
  isPartial: boolean,
): Promise<void> {
  const oid = new mongoose.Types.ObjectId(disputeId);
  const dispute = await Dispute.findById(oid);
  if (!dispute) return;

  await Dispute.findByIdAndUpdate(oid, {
    disputeStatus: "closed",
    decision: "settled",
    action: isPartial ? "partial_refund" : "refund",
  });

  await Transaction.findByIdAndUpdate(dispute.transactionId, {
    hasDispute: false,
  });

  await ListingExchange.updateOne(
    { listingId: dispute.listingId },
    {
      $set: {
        paymentStatus: isPartial ? "succeeded" : "canceled",
      },
    },
  );
}
