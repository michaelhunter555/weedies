import type { Request, Response } from "express";
import mongoose from "mongoose";

import {
  finalizeListingFeeFromCheckoutSession,
  finalizeListingFeeFromPaymentIntent,
} from "../../lib/finalize-listing-fee-payment";
import Listing from "../../models/listing";
import stripe from "../../utils/stripe";

/**
 * POST /api/stripe/confirm-listing-fee-checkout
 * Body: `{ listingId: string, sessionId: string }`
 *
 * Called from the client after Stripe Checkout success so listings move to
 * `pending_review` even when webhooks are not configured (local dev).
 */
export default async function confirmListingFeeCheckout(
  req: Request,
  res: Response,
) {
  try {
    const sellerId = req.user?.userId;
    if (!sellerId) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    const body = (req.body || {}) as { listingId?: unknown; sessionId?: unknown };
    const listingId = String(body.listingId ?? "").trim();
    const sessionId = String(body.sessionId ?? "").trim();

    if (!mongoose.isValidObjectId(listingId)) {
      return void res.status(400).json({ message: "Invalid listing id" });
    }
    if (sessionId && !sessionId.startsWith("cs_")) {
      return void res.status(400).json({ message: "Invalid checkout session id" });
    }

    let result: Awaited<ReturnType<typeof finalizeListingFeeFromCheckoutSession>>;

    if (sessionId) {
      result = await finalizeListingFeeFromCheckoutSession(sessionId, sellerId);
    } else {
      const listing = await Listing.findOne({
        _id: listingId,
        sellerId,
      }).select("status");
      if (!listing) {
        return void res.status(404).json({ message: "Listing not found" });
      }
      if (listing.status === "pending_review" || listing.status === "live") {
        return void res.status(200).json({
          ok: true,
          status: listing.status,
          message: "Listing fee already recorded",
        });
      }
      const search = await stripe.paymentIntents.search({
        query: `metadata['listingId']:'${listingId}' AND metadata['paymentType']:'listing-fee'`,
        limit: 1,
      });
      const pi = search.data[0];
      if (!pi) {
        return void res.status(409).json({
          ok: false,
          status: listing.status,
          message:
            "No completed listing-fee payment found. Finish checkout or open the success link from Stripe again.",
        });
      }
      try {
        await finalizeListingFeeFromPaymentIntent(pi);
      } catch (err) {
        console.error("confirmListingFeeCheckout PI search:", err);
        return void res.status(500).json({ message: "Failed to confirm listing fee payment" });
      }
      const updated = await Listing.findById(listingId).select("status");
      result = {
        ok: updated?.status !== "pending_listing_fee",
        status: updated?.status,
        message:
          updated?.status === "pending_review"
            ? "Listing submitted for admin review"
            : "Payment found but listing status could not be updated",
      };
    }

    if (!result.ok) {
      return void res.status(result.status === "pending_listing_fee" ? 409 : 400).json(result);
    }

    return void res.status(200).json(result);
  } catch (err) {
    console.error("confirmListingFeeCheckout error:", err);
    return void res.status(500).json({ message: "Failed to confirm listing fee payment" });
  }
}
