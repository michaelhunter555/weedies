import crypto from "crypto";

/**
 * Reddit CAPI v3 — POST /api/v3/pixels/{pixelId}/conversion_events
 *
 * v3 vs v2 highlights:
 * - Payload wrapped in { "data": { "events": [...] } }
 * - event_at: Unix epoch milliseconds (number)
 * - event_type → type
 * - tracking_type: UPPER_SNAKE_CASE (e.g. PURCHASE, SIGN_UP)
 * - event_metadata → metadata
 */
const redditAccessToken = process.env.REDDIT_ACCESS_TOKEN;
const redditAdId =process.env.REDDIT_AD_ID;
const redditApiUrl = redditAdId
  ? `https://ads-api.reddit.com/api/v3/pixels/${redditAdId}/conversion_events`
  : null;

/** Friendly names used by callers — mapped to v3 UPPER_SNAKE_CASE on send. */
export type TrackingType =
  | "Lead"
  | "Purchase"
  | "Search"
  | "ViewContent"
  | "AddToCart"
  | "SignUp"
  | "Custom";

const V3_TRACKING_TYPE: Record<TrackingType, string> = {
  Lead: "LEAD",
  Purchase: "PURCHASE",
  Search: "SEARCH",
  ViewContent: "VIEW_CONTENT",
  AddToCart: "ADD_TO_CART",
  SignUp: "SIGN_UP",
  Custom: "CUSTOM",
};

type TRedditUserInput = {
  ip_address?: string;
  email?: string;
  external_id?: string;
  uuid?: string;
};

export type RedditProductInput = {
  id?: string;
  name?: string;
  category?: string;
  quantity?: number;
  item_price?: number;
};

export type RedditEventMetadata = {
  conversion_id: string;
  item_count?: number;
  currency?: string;
  value?: number;
  products?: RedditProductInput[];
};

function hashForReddit(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

function buildRedditUser(user: TRedditUserInput): Record<string, string> {
  const out: Record<string, string> = {};
  if (user.ip_address?.trim()) out.ip_address = user.ip_address.trim();
  if (user.email?.trim()) out.email = hashForReddit(user.email);
  if (user.external_id?.trim()) out.external_id = hashForReddit(user.external_id);
  if (user.uuid?.trim()) out.uuid = user.uuid.trim();
  return out;
}

function buildRedditMetadata(metadata: RedditEventMetadata): Record<string, unknown> {
  const itemCount = metadata.item_count ?? metadata.products?.length ?? undefined;
  const out: Record<string, unknown> = {
    conversion_id: metadata.conversion_id,
  };

  if (itemCount != null) out.item_count = itemCount;
  if (metadata.currency) out.currency = metadata.currency.toUpperCase();
  if (metadata.value != null) out.value = metadata.value;

  if (metadata.products?.length) {
    const unitPrice =
      metadata.value != null && itemCount === 1 ? metadata.value : undefined;
    out.products = metadata.products.map((product) => ({
      ...(product.id ? { id: product.id } : {}),
      ...(product.name ? { name: product.name } : {}),
      ...(product.category ? { category: product.category } : {}),
      quantity: product.quantity ?? 1,
      ...(product.item_price != null
        ? { item_price: product.item_price }
        : unitPrice != null
          ? { item_price: unitPrice }
          : {}),
    }));
  }

  return out;
}

export async function trackRedditEvent(
  trackingType: TrackingType,
  user: TRedditUserInput,
  metadata: RedditEventMetadata,
  customEventName?: string,
): Promise<void> {
  if (!redditAccessToken || !redditApiUrl) return;

  const redditUser = buildRedditUser(user);
  const v3TrackingType = V3_TRACKING_TYPE[trackingType];

  const payload = {
    data: {
      events: [
        {
          event_at: Date.now(),
          action_source: "WEBSITE",
          type: {
            tracking_type: v3TrackingType,
            ...(trackingType === "Custom" && customEventName
              ? { custom_event_name: customEventName }
              : {}),
          },
          ...(Object.keys(redditUser).length ? { user: redditUser } : {}),
          metadata: buildRedditMetadata(metadata),
        },
      ],
    },
  };

  try {
    const resp = await fetch(redditApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redditAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5_000),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      console.error("Reddit CAPI error:", resp.status, text.slice(0, 500));
    }
  } catch (err) {
    console.error("Failed to track Reddit event:", err);
  }
}

export function enqueueRedditEvent(
  trackingType: TrackingType,
  user: TRedditUserInput,
  metadata: RedditEventMetadata,
  customEventName?: string,
): void {
  void trackRedditEvent(trackingType, user, metadata, customEventName).catch((err) => {
    console.error("Reddit CAPI enqueue failed:", err);
  });
}
