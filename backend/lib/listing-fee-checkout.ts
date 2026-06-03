import crypto from "crypto";

import User from "../models/user";
import stripe from "../utils/stripe";

export type ListingFeeKind = "submit" | "private-addon" | "relist";

function clientOrigin(): string {
  const raw = process.env.CLIENT_ORIGIN?.trim();
  if (raw) {
    const first = raw.split(",")[0]?.trim();
    if (first) return first.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

/** Ensure every seller has a Stripe Customer (no saved card required). */
export async function ensureStripeCustomerForUser(user: {
  _id: unknown;
  email?: string;
  name?: string;
  stripeCustomerId?: string | null;
}): Promise<string> {
  const existing = user.stripeCustomerId?.trim();
  if (existing) return existing;

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
  });
  await User.findByIdAndUpdate(user._id, {
    $set: { stripeCustomerId: customer.id },
  });
  return customer.id;
}

export function isCardlessListingFeeCheckout(user: {
  defaultPaymentIntendId?: string | null;
}): boolean {
  return !user.defaultPaymentIntendId?.trim();
}

/**
 * Hosted Checkout for platform listing fees (no off-session card required).
 * Metadata is duplicated on the session and PaymentIntent for webhooks.
 */
export async function createListingFeeCheckoutSession(params: {
  customerId: string;
  listingId: string;
  sellerId: string;
  amountUsd: number;
  description: string;
  listingFeeKind: ListingFeeKind;
  cardlessCheckout: boolean;
  isPrivateListing?: boolean;
  idempotencyKey?: string;
}): Promise<string> {
  const amountCents = Math.round(params.amountUsd * 100);
  if (!Number.isFinite(amountCents) || amountCents < 50) {
    throw new Error("Listing fee amount is too small for Stripe Checkout.");
  }

  const origin = clientOrigin();
  const listingId = params.listingId;
  const meta: Record<string, string> = {
    listingId,
    sellerId: params.sellerId,
    paymentType: "listing-fee",
    listingFeeKind: params.listingFeeKind,
    cardlessCheckout: params.cardlessCheckout ? "true" : "false",
    isPrivateListing: params.isPrivateListing ? "true" : "false",
  };

  const session = await stripe.checkout.sessions.create(
    {
      customer: params.customerId,
      payment_method_types: ["card"],
      mode: "payment",
      cancel_url: `${origin}/products?list=edit&listingId=${encodeURIComponent(listingId)}&listing_fee=cancelled`,
      success_url: `${origin}/products?listed=1&listing_id=${encodeURIComponent(listingId)}`,
      client_reference_id: listingId,
      metadata: meta,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amountCents,
            product_data: {
              name: params.description,
            },
          },
        },
      ],
      payment_intent_data: {
        metadata: meta,
      },
      ...(params.cardlessCheckout
        ? {
            saved_payment_method_options: {
              payment_method_save: "disabled" as const,
            },
          }
        : {}),
    },
    {
      idempotencyKey:
        params.idempotencyKey ??
        `${listingId}::listing-fee-checkout::${crypto.randomUUID()}`,
    },
  );

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL.");
  }
  return session.url;
}
