/**
 * Socket.IO event names emitted by our API (not Stripe webhooks).
 * Keep in sync with `client/src/context/socket-io/events.ts`.
 */
export const SocketEvents = {
  AUCTION_BID_PLACED: "auction.bid.placed",
  AUCTION_BID_RESOLVED: "auction.bid.resolved",
  PRIVATE_LISTING_REQUEST_CREATED: "listing.private.request.created",
  PRIVATE_LISTING_REQUEST_RESOLVED: "listing.private.request.resolved",
  /** Same string as client `Notifications.NEW_MESSAGE` — invalidates inbox. */
  CHAT_MESSAGE_NEW: "chat.message.new",
  /** Same string as client `Notifications.NEW_REVIEW`. */
  NEW_REVIEW: "review.submitted",
  /** Seller capture/cancel finished — both parties refresh exchange room. */
  EXCHANGE_UPDATED: "exchange.updated",
  DISPUTE_OPENED: "dispute.opened",
  DISPUTE_UPDATED: "dispute.updated",
  DISPUTE_RESOLVED: "dispute.resolved",
} as const;
