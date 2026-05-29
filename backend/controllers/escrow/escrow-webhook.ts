import type { Request, Response } from "express";

import {
  getEscrowTransaction,
  type EscrowWebhookPayload,
} from "../../lib/escrow-api";
import {
  cancelEscrowListingPurchase,
  finalizeEscrowListingPurchase,
} from "../../lib/escrow-purchase-finalize";
import { platformApplicationFeeCents } from "../../lib/listing-asset-sale-fee";
import ProcessedWebhookEvent from "../../models/proccessedWebhookEvents";
import Transaction from "../../models/transactions";
import { userSaleNotificationEmail } from "../../lib/email-notifications";

const LOG_PREFIX = "[escrow-webhook]";

const FUNDED_EVENTS = new Set([
  "payment_approved",
  "payment_received",
  "payment_sent",
]);

const CANCEL_EVENTS = new Set(["cancel"]);

const COMPLETE_EVENTS = new Set(["payment_disbursed", "complete"]);

function webhookEventId(body: EscrowWebhookPayload): string {
  return `escrow:${body.event_type}:${body.event}:${body.transaction_id}`;
}

function scheduleAmountCents(escrowTx: Awaited<ReturnType<typeof getEscrowTransaction>>): number {
  const firstItem = escrowTx.items?.[0];
  const schedule = firstItem?.schedule?.[0];
  const raw = schedule?.amount;
  const dollars = typeof raw === "string" ? parseFloat(raw) : Number(raw ?? 0);
  if (!Number.isFinite(dollars) || dollars <= 0) return 0;
  return Math.round(dollars * 100);
}

/**
 * POST /api/escrow/webhook
 *
 * Escrow.com recommends verifying webhook payloads by re-fetching the transaction.
 */
export async function escrowWebhook(req: Request, res: Response) {
  const receivedAt = new Date().toISOString();

  try {
    const body = req.body as EscrowWebhookPayload;
    console.log(`${LOG_PREFIX} hit ${receivedAt}`, JSON.stringify(body));

    if (
      !body ||
      body.event_type !== "transaction" ||
      typeof body.event !== "string" ||
      body.transaction_id == null
    ) {
      console.warn(`${LOG_PREFIX} invalid payload`, body);
      return void res.status(400).json({ ok: false, message: "Invalid webhook payload" });
    }

    const eventId = webhookEventId(body);
    const escrowTransactionId = String(body.transaction_id);

    try {
      await ProcessedWebhookEvent.create({ eventId });
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code?: number }).code === 11000
      ) {
        console.log(
          `${LOG_PREFIX} duplicate tx=${escrowTransactionId} event=${body.event}`,
        );
        return void res.status(200).json({ ok: true, duplicate: true });
      }
      throw err;
    }

    console.log(
      `${LOG_PREFIX} processing tx=${escrowTransactionId} event=${body.event}`,
    );

    const escrowTx = await getEscrowTransaction(escrowTransactionId);

    const localTx = await Transaction.findOne({
      escrowTransactionId,
      paymentType: "escrow",
    });

    const listingIdFromMeta =
      localTx?.ListingId != null ? String(localTx.ListingId) : null;

    console.log(
      `${LOG_PREFIX} tx=${escrowTransactionId} localTx=${localTx?._id ? String(localTx._id) : "none"} listing=${listingIdFromMeta ?? "none"}`,
    );

    if (CANCEL_EVENTS.has(body.event)) {
      await cancelEscrowListingPurchase(escrowTransactionId);
      console.log(`${LOG_PREFIX} handled=cancel tx=${escrowTransactionId}`);
      return void res.status(200).json({ ok: true, handled: "cancel" });
    }

    if (FUNDED_EVENTS.has(body.event)) {
      if (!localTx || !listingIdFromMeta) {
        console.log(
          `${LOG_PREFIX} skipped funded tx=${escrowTransactionId} reason=no_local_transaction`,
        );
        return void res.status(200).json({ ok: true, skipped: "no_local_transaction" });
      }

      const amountCents =
        localTx.amountPaid ||
        scheduleAmountCents(escrowTx) ||
        0;
      const priceDollars = amountCents / 100;
      const serviceFeeCents =
        localTx.serviceFee || platformApplicationFeeCents(priceDollars);

      const paymentStatus =
        body.event === "payment_approved" || body.event === "payment_received"
          ? "succeeded"
          : "pending";

      await finalizeEscrowListingPurchase({
        listingId: listingIdFromMeta,
        buyerId: String(localTx.customerId),
        sellerId: String(localTx.sellerId),
        escrowTransactionId,
        amountCents,
        serviceFeeCents,
        currency: localTx.currency || escrowTx.currency || "usd",
        paymentStatus,
      });

      console.log(
        `${LOG_PREFIX} handled=${body.event} tx=${escrowTransactionId} listing=${listingIdFromMeta} paymentStatus=${paymentStatus}`,
      );
      return void res.status(200).json({ ok: true, handled: body.event });
    }

    if (COMPLETE_EVENTS.has(body.event) && localTx) {
      await Transaction.findByIdAndUpdate(localTx._id, {
        $set: { paymentStatus: "succeeded", paidOut: true, payoutDate: new Date() },
      });
      console.log(`${LOG_PREFIX} handled=${body.event} tx=${escrowTransactionId}`);
      return void res.status(200).json({ ok: true, handled: body.event });
    }

    if (body.event === "agree" && localTx) {
      console.log(`${LOG_PREFIX} acknowledged agree tx=${escrowTransactionId}`);
      return void res.status(200).json({ ok: true, handled: "agree" });
    }

    const PROGRESS_EVENTS = new Set([
      "accept",
      "receive",
      "party_verification_submitted",
      "ship",
    ]);
    if (PROGRESS_EVENTS.has(body.event) && localTx) {
      console.log(
        `${LOG_PREFIX} noted progress tx=${escrowTransactionId} event=${body.event} (no listing status change)`,
      );
      return void res.status(200).json({ ok: true, noted: body.event });
    }

    console.log(
      `${LOG_PREFIX} ignored tx=${escrowTransactionId} event=${body.event}`,
    );
    return void res.status(200).json({ ok: true, ignored: body.event });
  } catch (err) {
    console.error(`${LOG_PREFIX} error ${receivedAt}:`, err);
    return void res.status(500).json({ ok: false, message: "Webhook handler error" });
  }
}
