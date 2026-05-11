import { Request, Response } from "express";
import Stripe from "stripe";
import stripe from "../../../utils/stripe";
import { checkRoom } from "../../../utils/check-socket-room";
import { io } from "../../../app";
import Transaction from "../../../models/transactions";
import PayoutBatch from "../../../models/payoutBatch";
import ProcessedWebhookEvent from "../../../models/proccessedWebhookEvents";

// socket event names for the seller-facing Connect webhook
const Events = {
  PAYOUT_CREATED: "stripe.payout.created",
  PAYOUT_PAID: "stripe.payout.paid",
  PAYOUT_FAILED: "stripe.payout.failed",
  PAYOUT_CANCELED: "stripe.payout.canceled",
} as const;

/**
 * Seller-side Stripe webhook (Connect).
 *
 * Handles events on the seller's connected account — payouts, account
 * updates, etc. — and emits socket notifications to the seller.
 *
 * Buyer-side events (purchases, refunds, disputes) are in `./app-webhook.ts`.
 *
 * Brevo email hooks are stubbed as `TODO(brevo)` until the integration lands.
 */
export default async function v2Webhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"];
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig as string,
      String(process.env.STRIPE_CONNECT_WEBHOOK),
    );

    // dedupe against webhook retries
    try {
      await ProcessedWebhookEvent.create({ eventId: event.id });
    } catch (err: any) {
      if (err.code === 11000) {
        return void res.status(200).send({ received: true });
      }
      throw err;
    }

    switch (event.type) {
      case "payout.created": {
        const payout = event.data.object as Stripe.Payout;
        const { sellerId } = payout.metadata || {};
        if (!sellerId) break;

        if (checkRoom(io, String(sellerId))) {
          io.to(String(sellerId)).emit(Events.PAYOUT_CREATED, {
            message: "Payout created",
            amount: (payout.amount / 100).toFixed(2),
            currency: payout.currency,
          });
        }
        break;
      }

      case "payout.canceled": {
        const payout = event.data.object as Stripe.Payout;
        const { sellerId } = payout.metadata || {};
        if (!sellerId) break;

        if (checkRoom(io, String(sellerId))) {
          io.to(String(sellerId)).emit(Events.PAYOUT_CANCELED, {
            message: "A payout was canceled.",
            amount: (payout.amount / 100).toFixed(2),
            currency: payout.currency,
          });
        }
        break;
      }

      case "payout.failed": {
        const payout = event.data.object as Stripe.Payout;
        const { sellerId } = payout.metadata || {};
        if (!sellerId) break;

        if (checkRoom(io, String(sellerId))) {
          io.to(String(sellerId)).emit(Events.PAYOUT_FAILED, {
            message: "Payout failed",
            text: "Your bank rejected the payout — please verify your payout method.",
            amount: (payout.amount / 100).toFixed(2),
            currency: payout.currency,
          });
        }

        // TODO(brevo): email seller with remediation steps
        break;
      }

      case "payout.paid": {
        const payout = event.data.object as Stripe.Payout;
        const { sellerId, batchPayoutId } = payout.metadata || {};
        const usAmount = payout.amount / 100;
        const currency = payout.currency;

        if (!batchPayoutId) {
          console.log("payout.paid: missing batchPayoutId metadata", payout.id);
          break;
        }

        const batch = await PayoutBatch.findById(batchPayoutId);
        if (!batch) {
          console.log("payout.paid: no batch found for", payout.id);
          break;
        }

        await Transaction.updateMany(
          { _id: { $in: batch.transactions } },
          { paidOut: true, payoutDate: new Date() },
        );

        batch.status = "paid";
        batch.stripePayoutId = payout.id;
        batch.payoutDate = new Date();
        batch.currency = currency;
        await batch.save();

        if (sellerId && checkRoom(io, String(sellerId))) {
          io.to(String(sellerId)).emit(Events.PAYOUT_PAID, {
            message: "A payout has been issued!",
            text: `A payout of $${usAmount.toFixed(2)} has been deposited.`,
            amount: usAmount.toFixed(2),
            currency,
          });
        }

        // TODO(brevo): sendPayoutNotificationEmail(sellerEmail, sellerName, usAmount, currency)
        break;
      }

      // account.updated — grow into KYC / onboarding status changes
      case "account.updated":
      default:
        break;
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.log("v2Webhook error:", err);
    res.status(500).send("webhook Error");
  }
}
