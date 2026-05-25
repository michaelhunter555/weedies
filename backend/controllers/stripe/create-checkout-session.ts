import type { Request, Response } from "express";
import mongoose from "mongoose";
import crypto from "crypto";

import stripe from "../../utils/stripe";
import User from "../../models/user";
import Listing from "../../models/listing";
import {
  listingBuyItNowPriceDollars,
  platformApplicationFeeCents,
} from "../../lib/listing-asset-sale-fee";

function clientOrigin(): string {
  const raw = process.env.CLIENT_ORIGIN?.trim();
  if (raw) {
    const first = raw.split(",")[0]?.trim();
    if (first) return first.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

/**
 * Stripe Checkout for a fixed-price listing purchase.
 * Body: `{ listingId: string }`. Buyer is always `req.user` (never trust body customer ids).
 *
 * Stamps `payment_intent_data.metadata` for `webhooks/app-webhook.ts` (asset-sale).
 */
export default async function createCheckoutSession(req: Request, res: Response) {
  try {
    const buyerUserId = req.user?.userId;
    if (!buyerUserId) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    const listingIdRaw = (req.body as { listingId?: unknown })?.listingId;
    const listingId =
      typeof listingIdRaw === "string" ? listingIdRaw.trim() : String(listingIdRaw ?? "");
    if (!mongoose.isValidObjectId(listingId)) {
      return void res.status(400).json({ message: "Invalid listing id" });
    }

    const buyer = await User.findById(buyerUserId).select(
      "stripeCustomerId stripeConnectAccountId",
    );
    if (!buyer?.stripeCustomerId) {
      return void res.status(400).json({
        message: "Add billing in Wallet before checkout (Stripe customer missing).",
      });
    }

    const listing = await Listing.findById(listingId).select(
      "_id appName tagline slug photos coverIndex status saleType sellerId buyItNowPrice startingPrice currency",
    );
    if (!listing) {
      return void res.status(404).json({ message: "Listing not found" });
    }
    if (listing.status !== "live") {
      return void res.status(409).json({ message: "This listing is not available for purchase." });
    }
    if (listing.saleType === "auction") {
      return void res.status(400).json({ message: "Use the auction flow for this listing." });
    }

    const sellerIdStr = String(listing.sellerId);
    if (sellerIdStr === buyerUserId) {
      return void res.status(400).json({ message: "You cannot purchase your own listing." });
    }

    const seller = await User.findById(listing.sellerId).select("stripeConnectAccountId");
    const destination = seller?.stripeConnectAccountId?.trim();
    if (!destination) {
      return void res.status(409).json({
        message: "The seller cannot receive payments yet. Try again later or message them.",
      });
    }

    const priceDollars = listingBuyItNowPriceDollars(listing);
    if (!Number.isFinite(priceDollars) || priceDollars < 0.5) {
      return void res.status(400).json({ message: "Invalid or too small purchase amount." });
    }

    const unitAmountCents = Math.round(priceDollars * 100);
    const applicationFeeCents = platformApplicationFeeCents(priceDollars);
    if (applicationFeeCents >= unitAmountCents) {
      return void res.status(500).json({ message: "Invalid fee configuration" });
    }

    const currency = (listing.currency || "usd").toLowerCase();
    const origin = clientOrigin();
    const cancelUrl = `${origin}/checkout/${encodeURIComponent(listingId)}`;
    const successUrl = `${origin}/checkout/${encodeURIComponent(listingId)}/success?session_id={CHECKOUT_SESSION_ID}`;

    const coverIdx = Math.min(
      Math.max(0, listing.coverIndex ?? 0),
      Math.max(0, (listing.photos?.length ?? 0) - 1),
    );
    const cover = listing.photos?.[coverIdx] ?? listing.photos?.[0];
    const images =
      typeof cover === "string" && /^https:\/\//i.test(cover) ? [cover] : undefined;

    const meta = {
      listingId: String(listing._id),
      buyerId: buyerUserId,
      sellerId: sellerIdStr,
      serviceFee: String(applicationFeeCents),
      paymentType: "asset-sale",
    };

    const randomId = crypto.randomUUID();
    const session = await stripe.checkout.sessions.create(
      {
        customer: buyer.stripeCustomerId,
        payment_method_types: ["card"],
        mode: "payment",
        cancel_url: cancelUrl,
        success_url: successUrl,
        client_reference_id: String(listing._id),
        metadata: meta,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency,
              unit_amount: unitAmountCents,
              product_data: {
                name: listing.appName || "Listing purchase",
                description: listing.tagline || undefined,
                images,
              },
            },
          },
        ],
        payment_intent_data: {
          /** Authorize now; capture later (`requires_capture`) for controlled payouts. */
          capture_method: "manual",
          transfer_data: { destination },
          application_fee_amount: applicationFeeCents,
          metadata: meta,
        },
      },
      {
        idempotencyKey: `${String(listing._id)}::checkout::${randomId}`,
      },
    );

    if (!session.url) {
      return void res.status(500).json({ message: "Stripe did not return a checkout URL." });
    }

    return void res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("createCheckoutSession error:", err);
    const msg = err instanceof Error ? err.message : "Failed to create checkout session";
    return void res.status(500).json({ message: msg });
  }
}
