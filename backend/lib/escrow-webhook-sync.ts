import mongoose from "mongoose";

import type { EscrowTransactionResponse } from "./escrow-api";
import {
  cancelEscrowListingPurchase,
  finalizeEscrowListingPurchase,
} from "./escrow-purchase-finalize";
import { platformApplicationFeeCents } from "./listing-asset-sale-fee";
import {
  escrowFundsSecured,
  escrowItemCanceled,
} from "./escrow-reconcile";
import ListingExchange from "../models/exchange";
import Transaction, { type ITransaction } from "../models/transactions";

const LOG_PREFIX = "[escrow-sync]";

/** Append webhook event to the transaction ledger (last 50). */
export async function appendEscrowEvent(
  transactionId: mongoose.Types.ObjectId | string,
  event: string,
): Promise<void> {
  const at = new Date();
  await Transaction.findByIdAndUpdate(transactionId, {
    $set: {
      escrowLastEvent: event,
      escrowLastEventAt: at,
    },
    $push: {
      escrowEvents: {
        $each: [{ event, at }],
        $slice: -50,
      },
    },
  });
}

/**
 * After every Escrow webhook: log the event, then align Mongo with Escrow API state.
 */
export async function syncEscrowTransactionFromWebhook(
  localTx: Pick<
    ITransaction,
    | "_id"
    | "ListingId"
    | "customerId"
    | "sellerId"
    | "escrowTransactionId"
    | "paymentStatus"
    | "amountPaid"
    | "amountCharged"
    | "serviceFee"
    | "currency"
    | "paidOut"
  >,
  escrowTx: EscrowTransactionResponse,
  webhookEvent: string,
): Promise<
  "canceled" | "funded" | "payment_updated" | "recorded"
> {
  const txId = localTx._id;
  const escrowTransactionId = String(localTx.escrowTransactionId);
  const listingId = String(localTx.ListingId);

  await appendEscrowEvent(txId, webhookEvent);

  if (escrowItemCanceled(escrowTx)) {
    await cancelEscrowListingPurchase(escrowTransactionId);
    console.log(`${LOG_PREFIX} tx=${escrowTransactionId} canceled`);
    return "canceled";
  }

  const fundsSecured = escrowFundsSecured(escrowTx);
  const itemAccepted = Boolean(escrowTx.items?.[0]?.status?.accepted);
  const itemReceived = Boolean(escrowTx.items?.[0]?.status?.received);
  const closed = Boolean(escrowTx.close_date);

  const patch: Record<string, unknown> = {
    escrowFundsSecured: fundsSecured,
  };

  if (fundsSecured && localTx.paymentStatus === "pending") {
    patch.paymentStatus = "succeeded";
  }

  if (itemAccepted || itemReceived || closed) {
    patch.paymentStatus = "succeeded";
  }

  if (closed || webhookEvent === "payment_disbursed" || webhookEvent === "complete") {
    patch.paymentStatus = "succeeded";
    patch.paidOut = true;
    patch.payoutDate = new Date();
  }

  await Transaction.findByIdAndUpdate(txId, { $set: patch });

  if (fundsSecured) {
    const amountCents = Number(localTx.amountPaid ?? localTx.amountCharged ?? 0);
    const priceDollars = amountCents / 100;
    const serviceFeeCents =
      Number(localTx.serviceFee) || platformApplicationFeeCents(priceDollars);

    await finalizeEscrowListingPurchase({
      listingId,
      buyerId: String(localTx.customerId),
      sellerId: String(localTx.sellerId),
      escrowTransactionId,
      amountCents,
      serviceFeeCents,
      currency: localTx.currency || escrowTx.currency || "usd",
      paymentStatus: "succeeded",
    });

    await ListingExchange.updateOne(
      { listingId: new mongoose.Types.ObjectId(listingId) },
      {
        $set: {
          paymentStatus: "succeeded",
          sellerCapturedPayment: true,
          paymentReceivedAt: new Date(),
        },
      },
    );

    console.log(`${LOG_PREFIX} tx=${escrowTransactionId} funded (event=${webhookEvent})`);
    return "funded";
  }

  if (patch.paymentStatus === "succeeded") {
    await ListingExchange.updateOne(
      { listingId: new mongoose.Types.ObjectId(listingId) },
      {
        $set: {
          paymentStatus: "succeeded",
          sellerCapturedPayment: true,
        },
      },
    );
    console.log(
      `${LOG_PREFIX} tx=${escrowTransactionId} payment=succeeded (event=${webhookEvent})`,
    );
    return "payment_updated";
  }

  console.log(`${LOG_PREFIX} tx=${escrowTransactionId} recorded event=${webhookEvent}`);
  return "recorded";
}
