/** Reddit Ads pixel helpers — base init lives in `app/layout.tsx`. */

export const REDDIT_CUSTOM_EVENTS = {
  PAID_LISTING_FEE_STARTED: "PaidListingFeeStarted",
  FREE_LISTING_CREATED: "FreeListingCreated",
  STRIPE_CHECKOUT_STARTED: "StripeCheckoutStarted",
  ESCROW_CHECKOUT_STARTED: "EscrowCheckoutStarted",
} as const;

type RedditTrackParams = Record<string, unknown>;

declare global {
  interface Window {
    rdt?: (command: string, ...args: unknown[]) => void;
  }
}

const REDIRECT_TRACK_DELAY_MS = 150;

function trackReddit(event: string, params?: RedditTrackParams) {
  if (typeof window === "undefined") return;
  window.rdt?.("track", event, params);
}

export function trackRedditCustom(
  customEventName: string,
  params?: RedditTrackParams,
) {
  trackReddit("Custom", { customEventName, ...params });
}

export function trackRedditAddToCart(params: {
  listingId: string;
  name: string;
  category?: string;
  value: number;
  currency?: string;
}) {
  const currency = (params.currency ?? "USD").toUpperCase();
  trackReddit("AddToCart", {
    currency,
    value: params.value,
    itemCount: 1,
    products: [
      {
        id: params.listingId,
        category: params.category,
        name: params.name,
        price: params.value,
        quantity: 1,
      },
    ],
  });
}

export function trackRedditPurchase(params: {
  conversionId: string;
  currency?: string;
  value?: number;
  itemCount?: number;
}) {
  trackReddit("Purchase", {
    conversionId: params.conversionId,
    currency: (params.currency ?? "USD").toUpperCase(),
    ...(params.value != null && params.value > 0 ? { value: params.value } : {}),
    ...(params.itemCount != null ? { itemCount: params.itemCount } : {}),
  });
}

/** Fire a custom event, then navigate after a short delay so the pixel can flush. */
export function trackRedditCustomThenAssign(
  url: string,
  customEventName: string,
  params?: RedditTrackParams,
) {
  trackRedditCustom(customEventName, params);
  window.setTimeout(() => {
    window.location.assign(url);
  }, REDIRECT_TRACK_DELAY_MS);
}
