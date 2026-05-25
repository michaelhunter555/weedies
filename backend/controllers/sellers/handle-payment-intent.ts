import type { Request, Response } from "express";
import mongoose from "mongoose";

import { io } from "../../app";
import { SocketEvents } from "../../lib/socket-events";
import Listing from "../../models/listing";
import ListingExchange from "../../models/exchange";
import Transaction from "../../models/transactions";
import stripe from "../../utils/stripe";

function emitExchangeUpdated(
  participantIds: string[],
  payload: Record<string, unknown>,
) {
  const seen = new Set<string>();
  for (const id of participantIds) {
    const trimmed = String(id ?? "").trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    const room = io.sockets.adapter.rooms.get(trimmed);
    if (room && room.size > 0) {
      io.to(trimmed).emit(SocketEvents.EXCHANGE_UPDATED, payload);
    }
  }
}

/**
 * Seller capture/cancel on Stripe for a sold listing. DB truth for `Transaction`
 * and exchange payment fields still comes from webhooks; we optionally mark
 * exchange `canceled` on cancel so the room updates before Stripe retries.
 */
export default async function handlePaymentIntent(req: Request, res: Response) {
  const userId = req.user?.userId;
  if (!userId) {
    return void res.status(401).json({ message: "Unauthorized" });
  }

  const { listingId, sellerAction } = req.body as {
    listingId?: string;
    sellerAction?: string;
  };

  if (!listingId || (sellerAction !== "capture" && sellerAction !== "cancel")) {
    return void res.status(400).json({
      message: "Missing listingId or sellerAction (capture | cancel).",
    });
  }

  if (!mongoose.isValidObjectId(listingId)) {
    return void res.status(400).json({ message: "Invalid listing id" });
  }

  try {
    const listing = await Listing.findById(listingId).select("sellerId status");
    if (!listing || listing.status !== "sold") {
      return void res.status(404).json({ message: "Listing not found or not sold." });
    }

    const sellerOid = listing.sellerId;
    const sellerStr =
      sellerOid instanceof mongoose.Types.ObjectId
        ? String(sellerOid)
        : sellerOid && typeof sellerOid === "object" && "_id" in sellerOid
          ? String((sellerOid as { _id: unknown })._id)
          : String(sellerOid ?? "");

    if (sellerStr !== userId) {
      return void res.status(403).json({ message: "Only the seller can capture or cancel." });
    }

    const tx = (await Transaction.findOne({
      ListingId: new mongoose.Types.ObjectId(listingId),
      billingReason: "Listing purchase",
    })
      .sort({ createdAt: -1 })
      .lean()) as { stripePaymentIntentId?: string } | null;

    const piId = tx?.stripePaymentIntentId;
    if (!piId) {
      return void res.status(404).json({ message: "No checkout payment found for this listing." });
    }

    const intent = await stripe.paymentIntents.retrieve(piId);
    const listingOid = new mongoose.Types.ObjectId(listingId);

    if (sellerAction === "capture") {
      if (intent.status !== "requires_capture") {
        return void res.status(400).json({
          message: `Payment intent is not capturable (status: ${intent.status}).`,
        });
      }
      const captured = await stripe.paymentIntents.capture(piId);

      // Webhooks are the authoritative path, but they can race the seller UI.
      // Mirror the success here so the next refetch (or the socket-driven
      // invalidate) immediately shows "Funds captured".
      if (captured.status === "succeeded") {
        const chargeId =
          typeof captured.latest_charge === "string"
            ? captured.latest_charge
            : "";
        await Promise.all([
          ListingExchange.updateOne(
            { listingId: listingOid },
            {
              $set: {
                paymentStatus: "succeeded",
                sellerCapturedPayment: true,
                paymentCaptureExpiration: null,
              },
            },
          ),
          Transaction.updateOne(
            {
              stripePaymentIntentId: piId,
              paymentStatus: { $ne: "succeeded" },
            },
            {
              $set: {
                paymentStatus: "succeeded",
                ...(chargeId ? { chargeId } : {}),
              },
            },
          ),
        ]);
      }

      const exchangeDoc = (await ListingExchange.findOne({
        listingId: listingOid,
      })
        .select("buyerId sellerId")
        .lean()) as { buyerId?: unknown; sellerId?: unknown } | null;

      emitExchangeUpdated(
        [
          exchangeDoc?.buyerId != null ? String(exchangeDoc.buyerId) : "",
          exchangeDoc?.sellerId != null ? String(exchangeDoc.sellerId) : "",
          sellerStr,
        ],
        {
          listingId,
          action: "captured",
          paymentStatus: "succeeded",
          message: "Payment captured.",
        },
      );

      return void res.status(200).json({ ok: true, paymentStatus: "succeeded" });
    }

    const cancelable =
      intent.status === "requires_capture" ||
      intent.status === "requires_payment_method" ||
      intent.status === "requires_confirmation" ||
      intent.status === "requires_action";
    if (!cancelable) {
      return void res.status(400).json({
        message: `Payment intent cannot be canceled from status ${intent.status}.`,
      });
    }
    await stripe.paymentIntents.cancel(piId);
    await ListingExchange.updateOne(
      { listingId: listingOid },
      { $set: { paymentStatus: "canceled", sellerCapturedPayment: false } },
    );

    const exchangeDoc = (await ListingExchange.findOne({
      listingId: listingOid,
    })
      .select("buyerId sellerId")
      .lean()) as { buyerId?: unknown; sellerId?: unknown } | null;

    emitExchangeUpdated(
      [
        exchangeDoc?.buyerId != null ? String(exchangeDoc.buyerId) : "",
        exchangeDoc?.sellerId != null ? String(exchangeDoc.sellerId) : "",
        sellerStr,
      ],
      {
        listingId,
        action: "canceled",
        paymentStatus: "canceled",
        message: "Authorization canceled.",
      },
    );

    return void res.status(200).json({ ok: true, paymentStatus: "canceled" });
  } catch (err) {
    console.error("handlePaymentIntent error:", err);
    return void res.status(500).json({ message: "Failed to update payment" });
  }
}
