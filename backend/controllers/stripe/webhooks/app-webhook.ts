import { Request, Response } from "express";
import Stripe from "stripe";
import mongoose from "mongoose";
import stripe from "../../../utils/stripe";
import { checkRoom } from "../../../utils/check-socket-room";
import { io } from "../../../app";
import Listing from "../../../models/listing";
import ListingExchange from "../../../models/exchange";
import Transaction from "../../../models/transactions";
import User from "../../../models/user";
import Disputes from "../../../models/disputes";
import ProcessedWebhookEvent from "../../../models/proccessedWebhookEvents";

// socket event names for the buyer-facing app webhook
const Events = {
  CARD_ADDED: "stripe.setup_intent.succeeded",
  PURCHASE_SUCCEEDED: "stripe.payment.succeeded",
  PURCHASE_CANCELED: "stripe.payment.canceled",
  PURCHASE_FAILED: "stripe.payment.failed",
  REFUND_STARTED: "stripe.refund.started",
  REFUND_COMPLETED: "stripe.refund.completed",
  // Listing-fee-specific events (seller paid the $2.99 listing fee).
  // Kept distinct from PURCHASE_* so the UI can show different copy
  // ("Your listing is live" vs "Your listing sold").
  LISTING_FEE_PAID: "listing.fee.paid",
  LISTING_FEE_FAILED: "listing.fee.failed",
  LISTING_FEE_REFUNDED: "listing.fee.refunded",
} as const;

/**
 * We stamp `paymentType` onto every PaymentIntent / Refund in metadata so
 * this webhook can decide which side-effects to run. Two flows today:
 *
 *   - "asset-sale"  → buyer buys a listing from a seller (default)
 *   - "listing-fee" → seller pays the platform's listing fee
 */
type PaymentType = "asset-sale" | "listing-fee";

function readPaymentType(
  metadata: Record<string, string | undefined> | null | undefined,
): PaymentType {
  return metadata?.paymentType === "listing-fee" ? "listing-fee" : "asset-sale";
}

/** Approximate last moment to capture an authorized card payment (PI `created` + 7d). */
function approximateCaptureAuthorizationExpires(pi: Stripe.PaymentIntent): Date {
  const createdSec =
    typeof pi.created === "number" ? pi.created : Math.floor(Date.now() / 1000);
  return new Date(createdSec * 1000 + 7 * 24 * 60 * 60 * 1000);
}

/**
 * Platform-level (buyer) Stripe webhook.
 *
 * Handles events tied to a buyer paying for a listing on the marketplace:
 *  - adding a card (setup intent)
 *  - paying for a listing (payment intent)
 *  - refunds & disputes
 *
 * Seller-side Connect events (payouts, account.updated, …) are handled in
 * `./v2-webhook.ts`.
 */
export default async function appWebhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"];
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig as string,
      String(process.env.STRIPE_WEBHOOK_SECRET),
    );

    // prevent duplicate side-effects from webhook retries
    try {
      await ProcessedWebhookEvent.create({ eventId: event.id });
    } catch (err: any) {
      if (err.code === 11000) {
        return void res.status(200).send({ received: true });
      }
      throw err;
    }

    switch (event.type) {
      // ────────────────────────────────────────────────────────────────
      // Buyer added a card
      // ────────────────────────────────────────────────────────────────
      case "setup_intent.succeeded": {
        const setupIntent = event.data.object as Stripe.SetupIntent;
        const customerId =
          typeof setupIntent.customer === "string"
            ? setupIntent.customer
            : setupIntent.customer?.id ?? null;
        const rawPm = setupIntent.payment_method;
        const pmId =
          typeof rawPm === "string"
            ? rawPm
            : rawPm && typeof rawPm === "object" && "id" in rawPm
              ? String((rawPm as { id: string }).id)
              : null;

        const buyer = customerId
          ? await User.findOne({ stripeCustomerId: customerId }).select("_id")
          : null;

        if (buyer && customerId && pmId) {
          try {
            const customer = await stripe.customers.retrieve(customerId);
            if (!("deleted" in customer && customer.deleted)) {
              const c = customer as Stripe.Customer;
              const currentInv = c.invoice_settings?.default_payment_method;
              const currentId =
                typeof currentInv === "string"
                  ? currentInv
                  : currentInv && typeof currentInv === "object" && "id" in currentInv
                    ? String((currentInv as { id: string }).id)
                    : null;

              if (!currentId) {
                await stripe.customers.update(customerId, {
                  invoice_settings: { default_payment_method: pmId },
                });
              }

              const refreshed = await stripe.customers.retrieve(customerId);
              const cr = refreshed as Stripe.Customer;
              const inv = cr.invoice_settings?.default_payment_method;
              const resolvedDefault =
                typeof inv === "string"
                  ? inv
                  : inv && typeof inv === "object" && "id" in inv
                    ? String((inv as { id: string }).id)
                    : pmId;

              await User.findByIdAndUpdate(buyer._id, {
                $set: { defaultPaymentIntendId: resolvedDefault },
              });
            }
          } catch (e) {
            console.error("setup_intent.succeeded: sync default PM to user", e);
          }
        }

        if (buyer && checkRoom(io, String(buyer._id))) {
          io.to(String(buyer._id)).emit(Events.CARD_ADDED, {
            message: "Card added successfully.",
            text: "You're all set to buy listings.",
          });
        }
        break;
      }

      // ────────────────────────────────────────────────────────────────
      // Checkout Session completed (buyer finished Hosted Checkout). With
      // `capture_method: manual`, Stripe often sets `payment_status` to
      // `unpaid` while the PI is `requires_capture` — do **not** require
      // `payment_status === "paid"` or we never finalize. We gate on a
      // complete session + PI state after retrieve below.
      // ────────────────────────────────────────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "payment") {
          break;
        }
        if (session.status !== "complete") {
          break;
        }
        const piRef = session.payment_intent;
        const piId =
          typeof piRef === "string" ? piRef : piRef && typeof piRef === "object" && "id" in piRef
            ? String((piRef as { id: string }).id)
            : "";
        if (!piId) {
          break;
        }
        let pi: Stripe.PaymentIntent;
        try {
          pi = await stripe.paymentIntents.retrieve(piId);
        } catch (e) {
          console.error("checkout.session.completed: retrieve PI", e);
          break;
        }
        const allowedPi: Stripe.PaymentIntent.Status[] = [
          "requires_capture",
          "processing",
          "succeeded",
        ];
        if (!pi.status || !allowedPi.includes(pi.status)) {
          break;
        }
        const metadata = pi.metadata || {};
        if (readPaymentType(metadata) !== "asset-sale") {
          break;
        }
        const { listingId, buyerId, sellerId, serviceFee } = metadata;
        if (!listingId || !buyerId || !sellerId) {
          break;
        }
        const dupTx = await Transaction.findOne({ stripePaymentIntentId: pi.id });
        if (dupTx) {
          break;
        }
        const listingPre = await Listing.findById(listingId).select("status buyerId");
        if (
          listingPre?.status === "sold" &&
          listingPre.buyerId &&
          String(listingPre.buyerId) === buyerId
        ) {
          break;
        }
        const dbSession = await mongoose.startSession();
        dbSession.startTransaction();
        try {
          const listing = await Listing.findById(listingId).session(dbSession);
          if (!listing) {
            await dbSession.abortTransaction();
            dbSession.endSession();
            break;
          }

          const chargeId =
            typeof pi.latest_charge === "string" ? pi.latest_charge : "";
          const amountFmt = (pi.amount / 100).toFixed(2);
          const paymentStatus: "pending" | "succeeded" =
            pi.status === "requires_capture" || pi.status === "processing"
              ? "pending"
              : "succeeded";
          const transaction = new Transaction({
            ListingId: listing._id,
            customerId: buyerId,
            sellerId,
            stripePaymentIntentId: pi.id,
            stripeCustomerId:
              typeof pi.customer === "string" ? pi.customer : String(pi.customer ?? ""),
            amountCharged: pi.amount,
            amountPaid: pi.amount,
            serviceFee: Number(serviceFee) || 0,
            billingReason: "Listing purchase",
            paymentStatus,
            chargeId: chargeId || undefined,
            currency: pi.currency,
          });
          await transaction.save({ session: dbSession });
          listing.status = "sold";
          listing.buyerId = new mongoose.Types.ObjectId(buyerId);
          listing.soldAt = new Date();
          await listing.save({ session: dbSession });
          await ListingExchange.updateOne(
            { listingId: listing._id },
            {
              $set: {
                sellerId: listing.sellerId,
                buyerId: new mongoose.Types.ObjectId(buyerId),
                paymentReceivedAt: new Date(),
                paymentStatus: "pending",
                sellerCapturedPayment: false,
                paymentCaptureExpiration: approximateCaptureAuthorizationExpires(pi),
              },
              $setOnInsert: {
                listingId: listing._id,
                deliverables: [],
              },
            },
            { upsert: true, session: dbSession },
          );

          await User.findByIdAndUpdate(
            sellerId,
            { $inc: { totalSales: 1 } },
            { session: dbSession },
          );

          await dbSession.commitTransaction();
          dbSession.endSession();

          const payload = {
            listingId: String(listing._id),
            transactionId: String(transaction._id),
            amount: amountFmt,
            currency: pi.currency,
          };

          if (checkRoom(io, String(sellerId))) {
            io.to(String(sellerId)).emit(Events.PURCHASE_SUCCEEDED, {
              ...payload,
              message: `Your listing "${listing.appName}" just sold!`,
            });
          }

          if (checkRoom(io, String(buyerId))) {
            io.to(String(buyerId)).emit(Events.PURCHASE_SUCCEEDED, {
              ...payload,
              message: `Purchase confirmed for "${listing.appName}"`,
            });
          }
        } catch (err) {
          await dbSession.abortTransaction();
          dbSession.endSession();
          console.log("checkout.session.completed error:", err);
        }
        break;
      }

      // ────────────────────────────────────────────────────────────────
      // Payment intent succeeded. Branches on `paymentType`:
      //   - "listing-fee" → seller paid the platform to list an app
      //   - "asset-sale"  → buyer paid the seller to acquire the app
      // ────────────────────────────────────────────────────────────────
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const metadata = pi.metadata || {};
        const { listingId, buyerId, sellerId, serviceFee } = metadata;
        const paymentType = readPaymentType(metadata);

        // Ignore PIs that are unrelated to the marketplace (e.g. manual
        // top-ups, subscription renewals). We require at minimum a
        // listingId + the payer id for the flow.
        if (!listingId) {
          return void res.status(200).send({ received: true });
        }

        // ── Asset-sale + Checkout (manual capture), normal order ─────────
        // 1) `checkout.session.completed` creates the Transaction (often
        //    `paymentStatus: "pending"`) and marks the listing sold.
        // 2) `payment_intent.succeeded` fires only after capture → we only
        //    **update** that row (above). We return here whenever a row
        //    already exists so we never insert a second transaction for the
        //    same `stripePaymentIntentId`.
        //
        // The `new Transaction` block below is the **fallback** when (1) never
        // ran (e.g. only PI webhooks configured, or rare ordering) — not the
        // steady-state Checkout path.
        if (paymentType === "asset-sale") {
          const existing = await Transaction.findOne({ stripePaymentIntentId: pi.id });
          if (existing) {
            if (existing.paymentStatus === "pending" && pi.status === "succeeded") {
              const chargeId =
                typeof pi.latest_charge === "string" ? pi.latest_charge : "";
              await Transaction.findByIdAndUpdate(existing._id, {
                $set: {
                  paymentStatus: "succeeded",
                  ...(chargeId ? { chargeId } : {}),
                },
              });
              if (mongoose.isValidObjectId(listingId)) {
                await ListingExchange.updateOne(
                  { listingId: new mongoose.Types.ObjectId(listingId) },
                  {
                    $set: {
                      paymentStatus: "succeeded",
                      sellerCapturedPayment: true,
                      paymentCaptureExpiration: null,
                    },
                  },
                );
              }
            }
            return void res.status(200).send({ received: true });
          }
        }

        const dbSession = await mongoose.startSession();
        dbSession.startTransaction();

        try {
          const listing = await Listing.findById(listingId).session(dbSession);
          if (!listing) {
            await dbSession.abortTransaction();
            dbSession.endSession();
            return void res.status(200).send({ received: true });
          }

          const chargeId =
            typeof pi.latest_charge === "string" ? pi.latest_charge : "";
          const amountFmt = (pi.amount / 100).toFixed(2);

          // ────────────────────────────────────────────────────────────
          // Listing fee - seller paid the platform to publish a listing.
          // ────────────────────────────────────────────────────────────
          if (paymentType === "listing-fee") {
            if (!sellerId) {
              await dbSession.abortTransaction();
              dbSession.endSession();
              return void res.status(200).send({ received: true });
            }

            const transaction = new Transaction({
              ListingId: listing._id,
              // Payer is the seller - they ARE the customer on a listing fee.
              customerId: sellerId,
              sellerId,
              stripePaymentIntentId: pi.id,
              stripeCustomerId: pi.customer,
              amountCharged: pi.amount,
              amountPaid: pi.amount,
              // Listing fees are 100% platform revenue - no seller share.
              serviceFee: pi.amount,
              billingReason: "Listing fee",
              paymentStatus: "succeeded",
              chargeId,
              currency: pi.currency,
            });
            await transaction.save({ session: dbSession });

            // Never auto-publish from payment webhooks.
            // Admin moderation is the only path to `live`.
            listing.status = "pending_review";
            await listing.save({ session: dbSession });

            // totalListings is incremented when the draft is created (create-listing),
            // not here, so we do not $inc again on listing-fee success.

            await dbSession.commitTransaction();
            dbSession.endSession();

            if (checkRoom(io, String(sellerId))) {
              io.to(String(sellerId)).emit(Events.LISTING_FEE_PAID, {
                message: `"${listing.appName}" submitted for review`,
                text: "Your payment succeeded. Admin review is required before this goes live.",
                listingId: String(listing._id),
                transactionId: String(transaction._id),
                amount: amountFmt,
                currency: pi.currency,
              });
            }

            // TODO(brevo): send listing-live confirmation email to seller
            break;
          }

          // ────────────────────────────────────────────────────────────
          // Asset sale — fallback when no Transaction row yet (see comment
          // on `asset-sale` early-return above). Idempotent vs checkout race.
          // ────────────────────────────────────────────────────────────
          if (!buyerId || !sellerId) {
            await dbSession.abortTransaction();
            dbSession.endSession();
            return void res.status(200).send({ received: true });
          }

          const dupByPi = await Transaction.findOne({ stripePaymentIntentId: pi.id }).session(
            dbSession,
          );
          if (dupByPi) {
            await dbSession.abortTransaction();
            dbSession.endSession();
            return void res.status(200).send({ received: true });
          }

          const transaction = new Transaction({
            ListingId: listing._id,
            customerId: buyerId,
            sellerId,
            stripePaymentIntentId: pi.id,
            stripeCustomerId: pi.customer,
            amountCharged: pi.amount,
            amountPaid: pi.amount,
            serviceFee: Number(serviceFee) || 0,
            billingReason: "Listing purchase",
            paymentStatus: "succeeded",
            chargeId,
            currency: pi.currency,
          });
          await transaction.save({ session: dbSession });

          listing.status = "sold";
          listing.buyerId = new mongoose.Types.ObjectId(buyerId);
          listing.soldAt = new Date();
          await listing.save({ session: dbSession });

          await ListingExchange.updateOne(
            { listingId: listing._id },
            {
              $set: {
                sellerId: listing.sellerId,
                buyerId: new mongoose.Types.ObjectId(buyerId),
                paymentReceivedAt: new Date(),
                paymentStatus: "succeeded",
                sellerCapturedPayment: true,
                paymentCaptureExpiration: null,
              },
              $setOnInsert: {
                listingId: listing._id,
                deliverables: [],
              },
            },
            { upsert: true, session: dbSession },
          );

          await User.findByIdAndUpdate(
            sellerId,
            { $inc: { totalSales: 1 } },
            { session: dbSession },
          );

          await dbSession.commitTransaction();
          dbSession.endSession();

          const payload = {
            listingId: String(listing._id),
            transactionId: String(transaction._id),
            amount: amountFmt,
            currency: pi.currency,
          };

          if (checkRoom(io, String(sellerId))) {
            io.to(String(sellerId)).emit(Events.PURCHASE_SUCCEEDED, {
              ...payload,
              message: `Your listing "${listing.appName}" just sold!`,
            });
          }

          if (checkRoom(io, String(buyerId))) {
            io.to(String(buyerId)).emit(Events.PURCHASE_SUCCEEDED, {
              ...payload,
              message: `Purchase confirmed for "${listing.appName}"`,
            });
          }

          // TODO(brevo): send purchase-confirmation email to buyer + seller
        } catch (err) {
          await dbSession.abortTransaction();
          dbSession.endSession();
          console.log("payment_intent.succeeded error:", err);
        }
        break;
      }

      // ────────────────────────────────────────────────────────────────
      // Payment canceled before capture. Notify whichever party paid.
      // ────────────────────────────────────────────────────────────────
      case "payment_intent.canceled": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const metadata = pi.metadata || {};
        const { listingId, buyerId, sellerId } = metadata;
        const paymentType = readPaymentType(metadata);
        const payerId = paymentType === "listing-fee" ? sellerId : buyerId;

        if (!listingId || !payerId) {
          return void res.status(200).send({ received: true });
        }

        if (checkRoom(io, String(payerId))) {
          io.to(String(payerId)).emit(Events.PURCHASE_CANCELED, {
            message:
              paymentType === "listing-fee"
                ? "Listing payment canceled."
                : "Your purchase was canceled.",
            listingId,
            paymentType,
          });
        }

        if (paymentType === "asset-sale" && mongoose.isValidObjectId(listingId)) {
          await ListingExchange.updateOne(
            { listingId: new mongoose.Types.ObjectId(listingId) },
            { $set: { paymentStatus: "canceled", sellerCapturedPayment: false } },
          );
        }
        break;
      }

      // ────────────────────────────────────────────────────────────────
      // Payment failed. Notify the payer (buyer for sales, seller for
      // listing fees).
      // ────────────────────────────────────────────────────────────────
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const metadata = pi.metadata || {};
        const { listingId, buyerId, sellerId } = metadata;
        const paymentType = readPaymentType(metadata);
        const payerId = paymentType === "listing-fee" ? sellerId : buyerId;

        if (!listingId || !payerId) {
          return void res.status(200).send({ received: true });
        }

        const listing = await Listing.findById(listingId).select("appName");
        const label = listing?.appName ?? "the listing";

        if (paymentType === "listing-fee") {
          if (checkRoom(io, String(payerId))) {
            io.to(String(payerId)).emit(Events.LISTING_FEE_FAILED, {
              message: "Listing fee failed",
              text: `We couldn't charge the listing fee for "${label}". Please update your payment method and try again.`,
              listingId,
            });
          }
          break;
        }

        if (checkRoom(io, String(payerId))) {
          io.to(String(payerId)).emit(Events.PURCHASE_FAILED, {
            message: "Payment failed",
            text: `Your payment for "${label}" could not be processed.`,
            listingId,
          });
        }
        break;
      }

      // ────────────────────────────────────────────────────────────────
      // A refund has been initiated. For asset sales the seller sees
      // "will be deducted from your balance". For listing fees the
      // platform eats the refund, so we just let the seller know.
      // ────────────────────────────────────────────────────────────────
      case "refund.created": {
        const refund = event.data.object as Stripe.Refund;
        const metadata = refund.metadata || {};
        const { sellerId, listingId } = metadata;
        const paymentType = readPaymentType(metadata);
        if (!sellerId || !listingId) {
          return void res.status(200).send({ received: true });
        }

        const amount = (refund.amount / 100).toFixed(2);

        if (checkRoom(io, String(sellerId))) {
          io.to(String(sellerId)).emit(Events.REFUND_STARTED, {
            message: `$${amount} refund initiated`,
            text:
              paymentType === "listing-fee"
                ? `Your listing fee refund is being processed.`
                : `$${amount} will be deducted from your balance.`,
            listingId,
            paymentType,
          });
        }
        break;
      }

      // ────────────────────────────────────────────────────────────────
      // Refund failed - commonly insufficient funds on the connected account.
      // Attempt to reverse the transfer, otherwise charge the seller's
      // default payment method, otherwise record as seller debt.
      // ────────────────────────────────────────────────────────────────
      case "refund.failed": {
        const refund = event.data.object as Stripe.Refund;
        const metadata = refund.metadata || {};
        const { sellerId, listingId } = metadata;
        const paymentType = readPaymentType(metadata);
        if (!sellerId || !listingId) {
          return void res.status(200).send({ received: true });
        }

        // Listing-fee refunds come out of the platform's balance, not
        // the seller's connected account. The insufficient-funds /
        // transfer-reversal dance below is only relevant for asset sales.
        if (paymentType === "listing-fee") {
          if (checkRoom(io, String(sellerId))) {
            const amount = (refund.amount / 100).toFixed(2);
            io.to(String(sellerId)).emit(Events.LISTING_FEE_REFUNDED, {
              message: `$${amount} listing-fee refund failed`,
              text: `Refund failed: ${refund.failure_reason ?? "unknown"}. Support has been notified.`,
              reason: refund.failure_reason,
              listingId,
            });
          }
          break;
        }

        const seller = await User.findById(sellerId).select(
          "_id stripeConnectAccountId stripeCustomerId outstandingBalance",
        );
        if (!seller) break;

        const refundAmountCents = refund.amount;

        if (refund.failure_reason === "insufficient_funds") {
          const charge = await stripe.charges.retrieve(String(refund.charge));
          const transferId = charge.transfer;

          const balance = await stripe.balance.retrieve({
            stripeAccount: String(seller.stripeConnectAccountId),
          });
          const available =
            balance.available.find((b) => b.currency === "usd")?.amount || 0;
          const pending =
            balance.pending.find((b) => b.currency === "usd")?.amount || 0;
          const hasEnoughFunds = available + pending >= refundAmountCents;

          if (!hasEnoughFunds) {
            if (transferId) {
              await stripe.transfers.createReversal(
                String(transferId),
                { amount: refundAmountCents },
                { stripeAccount: seller.stripeConnectAccountId },
              );
            } else if (seller.stripeCustomerId) {
              const customer = (await stripe.customers.retrieve(
                seller.stripeCustomerId,
              )) as Stripe.Customer;
              const defaultPm = customer.invoice_settings?.default_payment_method;

              if (defaultPm) {
                try {
                  await stripe.paymentIntents.create(
                    {
                      amount: refundAmountCents,
                      currency: "usd",
                      customer: seller.stripeCustomerId,
                      metadata: {
                        reason: "Refund failed - insufficient seller balance",
                        listingId: String(listingId),
                      },
                    },
                    { idempotencyKey: `${String(refund.id)}:pi:refundDebt` },
                  );
                } catch (err) {
                  console.warn("Failed to charge seller for refund debt", err);
                  seller.outstandingBalance =
                    (seller.outstandingBalance || 0) + refundAmountCents;
                  await seller.save();
                }
              } else {
                seller.outstandingBalance =
                  (seller.outstandingBalance || 0) + refundAmountCents;
                await seller.save();
              }
            }
          }

          if (checkRoom(io, String(seller._id))) {
            const amount = (refund.amount / 100).toFixed(2);
            io.to(String(seller._id)).emit(Events.REFUND_STARTED, {
              message: `$${amount} refund failed`,
              text: `Refund failed: ${refund.failure_reason}.`,
              reason: refund.failure_reason,
            });
          }
        }
        break;
      }

      // ────────────────────────────────────────────────────────────────
      // Refund completed - record a negative transaction, close any
      // related dispute, notify buyer + seller.
      // ────────────────────────────────────────────────────────────────
      case "refund.updated": {
        const refund = event.data.object as Stripe.Refund;
        const metadata = refund.metadata || {};
        const { listingId, transactionId, reason } = metadata;
        const paymentType = readPaymentType(metadata);
        if (!listingId) {
          return void res.status(200).send({ received: true });
        }

        const listing = await Listing.findById(listingId).select(
          "_id appName buyerId sellerId",
        );
        if (!listing) {
          console.log("refund.updated: listing not found", listingId);
          return void res.status(200).send({ received: true });
        }

        // Payer depends on the flow:
        //   - asset-sale  → buyer paid, buyer is refunded
        //   - listing-fee → seller paid, seller is refunded
        const payerUserId =
          paymentType === "listing-fee" ? listing.sellerId : listing.buyerId;
        const payer = payerUserId
          ? await User.findById(payerUserId).select("_id stripeCustomerId")
          : null;

        const refundTransaction = new Transaction({
          ListingId: listing._id,
          customerId: payerUserId ?? listing.sellerId,
          sellerId: listing.sellerId,
          stripePaymentIntentId: refund.payment_intent as string,
          stripeCustomerId: payer?.stripeCustomerId || "",
          amountCharged: -refund.amount,
          amountPaid: -refund.amount,
          serviceFee: 0,
          billingReason:
            reason ||
            (paymentType === "listing-fee" ? "listing-fee refund" : "refund"),
          paymentStatus: refund.status === "succeeded" ? "succeeded" : "pending",
          chargeId: String(refund.charge || ""),
          refundId: refund.id,
          currency: "usd",
        });
        await refundTransaction.save();

        // Listing-fee refunds: flip the listing back to draft and notify
        // the seller. No dispute handling applies here.
        if (paymentType === "listing-fee") {
          await Listing.findByIdAndUpdate(listing._id, { status: "draft" });

          const amount = (refund.amount / 100).toFixed(2);
          if (checkRoom(io, String(listing.sellerId))) {
            io.to(String(listing.sellerId)).emit(Events.LISTING_FEE_REFUNDED, {
              message: `Listing fee refunded ($${amount}).`,
              text: `"${listing.appName}" has been moved back to draft.`,
              listingId: String(listing._id),
              transactionId: String(refundTransaction._id),
            });
          }
          break;
        }

        // Asset-sale refund path (existing behavior + dispute handling).
        let isDispute = false;
        let disputeId: string | undefined;
        if (metadata.isDispute === "true") {
          isDispute = true;
          const partialRefund = metadata.partialRefund === "true";
          disputeId = metadata.dispute_id;

          if (disputeId) {
            await Disputes.findByIdAndUpdate(disputeId, {
              disputeStatus: "closed",
              decision: "settled",
              action: partialRefund ? "partial_refund" : "refund",
            });
          }

          if (transactionId) {
            await Transaction.findByIdAndUpdate(transactionId, {
              hasDispute: false,
            });
          }
        }

        const amount = (refund.amount / 100).toFixed(2);
        const disputeExtras =
          isDispute && disputeId
            ? {
                disputeMessage: "Dispute closed",
                disputeId,
                transactionId: String(refundTransaction._id),
              }
            : {};

        if (payer && checkRoom(io, String(payer._id))) {
          io.to(String(payer._id)).emit(Events.REFUND_COMPLETED, {
            message: `We've issued a refund for $${amount}`,
            listingId: String(listing._id),
            dispute: isDispute,
            ...disputeExtras,
          });
        }

        if (checkRoom(io, String(listing.sellerId))) {
          io.to(String(listing.sellerId)).emit(Events.REFUND_COMPLETED, {
            message: `Refund for $${amount} completed.`,
            listingId: String(listing._id),
            dispute: isDispute,
            ...disputeExtras,
          });
        }

        // TODO(brevo): email payer + seller with refund receipt
        break;
      }

      // stubs we may grow into; keep for parity with Stripe dashboard events
      case "application_fee.refunded":
      case "account.updated":
        break;

      default:
        // no-op for events we don't care about
        break;
    }

    res.status(200).send({ received: true });
  } catch (err) {
    console.log("appWebhook error:", err);
    res.status(500).send("webhook Error");
  }
}
