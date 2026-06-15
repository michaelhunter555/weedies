import type { Request, Response } from "express";

import {
  getEscrowTransaction,
  type EscrowWebhookPayload,
} from "../../lib/escrow-api";
import { syncEscrowTransactionFromWebhook } from "../../lib/escrow-webhook-sync";
import { enqueueRedditEvent } from "../../lib/reddit-events";
import Listing from "../../models/listing";
import ProcessedWebhookEvent from "../../models/proccessedWebhookEvents";
import Transaction from "../../models/transactions";
import User from "../../models/user";

const LOG_PREFIX = "[escrow-webhook]";

function webhookEventId(body: EscrowWebhookPayload): string {
  return `escrow:${body.event_type}:${body.event}:${body.transaction_id}`;
}

/**
 * POST /api/escrow/webhook
 *
 * Log every event on the Transaction, then sync payment state from Escrow API.
 */
export async function escrowWebhook(req: Request, res: Response) {
  const receivedAt = new Date().toISOString();

  try {
    const body = req.body as EscrowWebhookPayload;
    // console.log(`${LOG_PREFIX} hit ${receivedAt}`, JSON.stringify(body));

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
        // console.log(
        //   `${LOG_PREFIX} duplicate tx=${escrowTransactionId} event=${body.event}`,
        // );
        return void res.status(200).json({ ok: true, duplicate: true });
      }
      throw err;
    }

    const localTx = await Transaction.findOne({
      escrowTransactionId,
      paymentType: "escrow",
    });

    if (!localTx) {
      // console.log(
      //   `${LOG_PREFIX} tx=${escrowTransactionId} event=${body.event} — no local transaction`,
      // );
      return void res.status(200).json({ ok: true, skipped: "no_local_transaction" });
    }

    const escrowTx = await getEscrowTransaction(escrowTransactionId);
    const wasPending = localTx.paymentStatus === "pending";
    const action = await syncEscrowTransactionFromWebhook(localTx, escrowTx, body.event);

    if (wasPending && action === "funded") {
      const [listing, buyer] = await Promise.all([
        Listing.findById(localTx.ListingId).select("appName category"),
        User.findById(localTx.customerId).select("email"),
      ]);
      const amountCents = Number(localTx.amountPaid ?? localTx.amountCharged ?? 0);
      enqueueRedditEvent(
        "Purchase",
        {
          email: buyer?.email ?? undefined,
          external_id: String(localTx.customerId),
        },
        {
          conversion_id: escrowTransactionId,
          value: amountCents / 100,
          currency: localTx.currency ?? escrowTx.currency ?? "usd",
          item_count: 1,
          products: listing
            ? [
                {
                  id: String(listing._id),
                  name: listing.appName,
                  category: listing.category,
                },
              ]
            : undefined,
        },
      );
    }

    // console.log(
    //   `${LOG_PREFIX} tx=${escrowTransactionId} event=${body.event} action=${action} localTx=${String(localTx._id)}`,
    // );

    return void res.status(200).json({ ok: true, action, event: body.event });
  } catch (err) {
    console.error(`${LOG_PREFIX} error ${receivedAt}:`, err);
    return void res.status(500).json({ ok: false, message: "Webhook handler error" });
  }
}
