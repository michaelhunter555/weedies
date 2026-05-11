import type { Request, Response } from "express";

/**
 * Creates a Stripe Checkout / PaymentIntent for a buyer purchasing a listing.
 *
 * Must stamp the following metadata for the webhook handler in
 * `webhooks/app-webhook.ts` to work correctly:
 *   - listingId
 *   - buyerId
 *   - sellerId
 *   - serviceFee (platform fee in cents)
 *
 * TODO: implement.
 */
export default async function createCheckoutSession(_req: Request, res: Response) {
  return res.status(501).json({ message: "Not implemented" });
}
