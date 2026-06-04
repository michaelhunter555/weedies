import mongoose from "mongoose";
import type Stripe from "stripe";

import { io } from "../app";
import Listing from "../models/listing";
import Transaction from "../models/transactions";
import stripe from "../utils/stripe";

function readPaymentType(metadata: Stripe.Metadata | null | undefined): string {
  return metadata?.paymentType === "listing-fee" ? "listing-fee" : "asset-sale";
}

/** If webhook ran twice or DB lagged, still move listing into the review queue. */
async function repairListingAfterListingFeePayment(
  listingId: string,
  paymentIntentId: string,
): Promise<boolean> {
  const listing = await Listing.findById(listingId);
  if (!listing) return false;

  let changed = false;
  if (listing.status === "pending_listing_fee") {
    listing.status = "pending_review";
    changed = true;
  }
  if (!listing.paymentIntentId?.trim()) {
    listing.paymentIntentId = paymentIntentId;
    changed = true;
  }
  if (changed) {
    await listing.save();
  }
  return changed;
}

function emitListingFeePaidSocket(sellerId: string, listing: { _id: unknown; appName?: string }) {
  void import("../utils/check-socket-room").then(({ checkRoom }) => {
    if (checkRoom(io, sellerId)) {
      io.to(sellerId).emit("listing.fee.paid", {
        message: `"${listing.appName}" submitted for review`,
        text: "Your payment succeeded. Admin review is required before this goes live.",
        listingId: String(listing._id),
      });
    }
  });
}

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

  if (readPaymentType(metadata) !== "listing-fee") {
    return false;
  }

  const allowed: Stripe.PaymentIntent.Status[] = [
    "succeeded",
    "processing",
    "requires_capture",
  ];
  if (!pi.status || !allowed.includes(pi.status)) {
    return false;
  }

  const existingTx = await Transaction.findOne({ stripePaymentIntentId: pi.id });
  if (existingTx) {
    const repaired = await repairListingAfterListingFeePayment(listingId, pi.id);
    if (repaired) {
      const listing = await Listing.findById(listingId).select("appName");
      if (listing) emitListingFeePaidSocket(String(sellerId), listing);
    }
    return repaired;
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

    emitListingFeePaidSocket(String(sellerId), listing);

    return true;
  } catch (err) {
    await dbSession.abortTransaction();
    dbSession.endSession();
    console.error("finalizeListingFeeFromPaymentIntent:", err);
    throw err;
  }
}

/**
 * After Stripe Checkout redirect — confirms payment when webhooks are delayed
 * (common in local dev without `stripe listen`).
 */
export async function finalizeListingFeeFromCheckoutSession(
  sessionId: string,
  sellerId: string,
): Promise<{ ok: boolean; status?: string; message?: string }> {
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.mode !== "payment") {
    return { ok: false, message: "Not a payment checkout session" };
  }
  if (session.status !== "complete") {
    return { ok: false, message: "Checkout is not complete yet" };
  }

  const listingId =
    session.metadata?.listingId?.trim() ||
    session.client_reference_id?.trim() ||
    "";
  if (!listingId) {
    return { ok: false, message: "Missing listing on checkout session" };
  }

  const sessionSeller = session.metadata?.sellerId?.trim();
  if (sessionSeller && sessionSeller !== sellerId) {
    return { ok: false, message: "Checkout session does not match this seller" };
  }

  const listing = await Listing.findById(listingId).select("sellerId status appName");
  if (!listing || String(listing.sellerId) !== sellerId) {
    return { ok: false, message: "Listing not found" };
  }

  if (listing.status === "pending_review" || listing.status === "live") {
    return { ok: true, status: listing.status, message: "Listing fee already recorded" };
  }

  const piRef = session.payment_intent;
  const piId =
    typeof piRef === "string"
      ? piRef
      : piRef && typeof piRef === "object" && "id" in piRef
        ? String((piRef as { id: string }).id)
        : "";
  if (!piId) {
    return {
      ok: false,
      status: listing.status,
      message: "Payment is still processing — refresh in a moment",
    };
  }

  const pi = await stripe.paymentIntents.retrieve(piId);
  if (readPaymentType(pi.metadata) !== "listing-fee") {
    return { ok: false, message: "Invalid payment type" };
  }

  try {
    await finalizeListingFeeFromPaymentIntent(pi);
  } catch (err) {
    console.error("finalizeListingFeeFromCheckoutSession:", err);
    return { ok: false, message: "Could not record listing fee payment" };
  }

  const updated = await Listing.findById(listingId).select("status");
  const status = updated?.status ?? listing.status;

  if (status === "pending_listing_fee") {
    return {
      ok: false,
      status,
      message:
        "Payment received but listing is still awaiting confirmation. Try again or contact support.",
    };
  }

  return {
    ok: true,
    status,
    message:
      status === "pending_review"
        ? "Listing submitted for admin review"
        : undefined,
  };
}
