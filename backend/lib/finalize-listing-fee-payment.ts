import mongoose from "mongoose";
import type Stripe from "stripe";

import { io } from "../app";
import Listing from "../models/listing";
import Transaction from "../models/transactions";

/**
 * Idempotent listing-fee settlement from a succeeded PaymentIntent
 * (Checkout Session or legacy off-session charge).
 */
export async function finalizeListingFeeFromPaymentIntent(
  pi: Stripe.PaymentIntent,
): Promise<boolean> {
  const metadata = pi.metadata || {};
  const listingId = metadata.listingId;
  const sellerId = metadata.sellerId;
  if (!listingId || !sellerId) {
    return false;
  }

  const dupTx = await Transaction.findOne({ stripePaymentIntentId: pi.id });
  if (dupTx) {
    return false;
  }

  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    const listing = await Listing.findById(listingId).session(dbSession);
    if (!listing) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      return false;
    }

    const chargeId =
      typeof pi.latest_charge === "string" ? pi.latest_charge : "";
    const amountFmt = (pi.amount / 100).toFixed(2);

    const transaction = new Transaction({
      ListingId: listing._id,
      customerId: sellerId,
      sellerId,
      stripePaymentIntentId: pi.id,
      stripeCustomerId:
        typeof pi.customer === "string" ? pi.customer : String(pi.customer ?? ""),
      amountCharged: pi.amount,
      amountPaid: pi.amount,
      serviceFee: pi.amount,
      billingReason: "Listing fee",
      paymentStatus: "succeeded",
      chargeId: chargeId || undefined,
      currency: pi.currency,
    });
    await transaction.save({ session: dbSession });

    listing.paymentIntentId = pi.id;

    if (listing.status === "pending_listing_fee") {
      listing.status = "pending_review";
    } else if (listing.status !== "pending_review") {
      listing.status = "pending_review";
    }

    if (metadata.isPrivateListing === "true" || metadata.listingFeeKind === "private-addon") {
      listing.isPrivateListing = true;
      listing.privateListingFeePaid = true;
    }

    await listing.save({ session: dbSession });

    await dbSession.commitTransaction();
    dbSession.endSession();

    const { checkRoom } = await import("../utils/check-socket-room");
    if (checkRoom(io, String(sellerId))) {
      io.to(String(sellerId)).emit("listing.fee.paid", {
        message: `"${listing.appName}" submitted for review`,
        text: "Your payment succeeded. Admin review is required before this goes live.",
        listingId: String(listing._id),
        transactionId: String(transaction._id),
        amount: amountFmt,
        currency: pi.currency,
      });
    }

    return true;
  } catch (err) {
    await dbSession.abortTransaction();
    dbSession.endSession();
    console.error("finalizeListingFeeFromPaymentIntent:", err);
    throw err;
  }
}
