/**
 * Socket event names shared by the web client and the backend emitters.
 *
 * IMPORTANT: these string values must match exactly what the backend
 * publishes in `backend/controllers/stripe/webhooks/*.ts` (and future
 * marketplace emitters). Keeping them in a single enum avoids silent
 * listener drift when either side renames an event.
 */
export const Notifications = {
  // ── Stripe: buyer (app) webhook ───────────────────────────────────────
  CARD_ADDED: "stripe.setup_intent.succeeded",
  PURCHASE_SUCCEEDED: "stripe.payment.succeeded",
  PURCHASE_CANCELED: "stripe.payment.canceled",
  PURCHASE_FAILED: "stripe.payment.failed",
  REFUND_STARTED: "stripe.refund.started",
  REFUND_COMPLETED: "stripe.refund.completed",

  // ── Listing fee (seller pays the platform to list) ────────────────────
  LISTING_FEE_PAID: "listing.fee.paid",
  LISTING_FEE_FAILED: "listing.fee.failed",
  LISTING_FEE_REFUNDED: "listing.fee.refunded",

  // ── Stripe: seller (connect / v2) webhook ─────────────────────────────
  PAYOUT_CREATED: "stripe.payout.created",
  PAYOUT_PAID: "stripe.payout.paid",
  PAYOUT_FAILED: "stripe.payout.failed",
  PAYOUT_CANCELED: "stripe.payout.canceled",

  // ── Marketplace (reserved - wire up as backend emitters land) ─────────
  LISTING_APPROVED: "listing.approved",
  LISTING_REJECTED: "listing.rejected",
  LISTING_SOLD: "listing.sold",
  /** Seller captured or canceled an authorized payment. */
  EXCHANGE_UPDATED: "exchange.updated",
  PRIVATE_LISTING_REQUEST_CREATED: "listing.private.request.created",
  PRIVATE_LISTING_REQUEST_RESOLVED: "listing.private.request.resolved",
  /** New bid on your listing (seller) or your bid was recorded (bidder). */
  AUCTION_BID_PLACED: "auction.bid.placed",
  /** Seller accepted/rejected a bid — notify bidder (and seller for UI sync). */
  AUCTION_BID_RESOLVED: "auction.bid.resolved",
  NEW_MESSAGE: "chat.message.new",
  NEW_REVIEW: "review.submitted",
  DISPUTE_OPENED: "dispute.opened",
  DISPUTE_RESOLVED: "dispute.resolved",
} as const;

export type NotificationName =
  (typeof Notifications)[keyof typeof Notifications];
