import type { CreateEscrowTransactionRequest } from "./escrow-api";
import { EscrowApplicationFee } from "./listing-asset-sale-fee";

type ListingLean = {
  _id: unknown;
  appName?: string;
  tagline?: string;
  slug?: string;
  photos?: string[];
  coverIndex?: number;
  currency?: string;
};

function clientOrigin(): string {
  const raw = process.env.CLIENT_ORIGIN?.trim();
  if (raw) {
    const first = raw.split(",")[0]?.trim();
    if (first) return first.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

/**
 * Build Escrow.com `POST /transaction` body for a marketplace listing purchase.
 *
 * Broker fee visibility follows Escrow docs: `broker_fee.visibility.hidden_from`
 * must match on all fee items, and parties listed there need `visibility` on the
 * party object (see brokered transaction example — seller when hiding from buyer).
 */
export function buildEscrowListingPurchasePayload(
  listing: ListingLean,
  buyerEmail: string,
  sellerEmail: string,
  priceDollars: number,
): CreateEscrowTransactionRequest {
  const origin = clientOrigin();
  const listingId = String(listing._id);
  const slug = String(listing.slug ?? "").trim();
  const photos = listing.photos ?? [];
  const coverIdx = Math.min(
    Math.max(0, listing.coverIndex ?? 0),
    Math.max(0, photos.length - 1),
  );
  const cover = photos[coverIdx] ?? photos[0];
  const merchantPath =
    slug && listingId
      ? `${origin}/products/${encodeURIComponent(listingId)}/${encodeURIComponent(slug)}`
      : `${origin}/products/${encodeURIComponent(listingId)}`;

  const platformFee = EscrowApplicationFee(priceDollars);
  const inspectionPeriod = Number(
    process.env.ESCROW_INSPECTION_PERIOD_SECONDS ?? 259200,
  );

  const brokerFeeHiddenFrom = [buyerEmail, sellerEmail];

  return {
    parties: [
      { role: "broker", customer: "me" },
      { role: "buyer", customer: buyerEmail },
      {
        role: "seller",
        customer: sellerEmail,
      },
    ],
    currency: "usd",
    description: `Purchase of ${listing.appName ?? "listing"} on Dap & Flip`,
    items: [
      {
        title: listing.appName ?? "Mobile app listing",
        description: listing.tagline || `Purchase of ${listing.appName ?? "app"}`,
        type: "general_merchandise",
        category: "mobile_apps",
        shipping_type: "no_shipping",
        inspection_period: inspectionPeriod,
        quantity: 1,
        schedule: [
          {
            amount: priceDollars,
            payer_customer: buyerEmail,
            beneficiary_customer: sellerEmail,
          },
        ],
        extra_attributes: {
          ...(typeof cover === "string" && cover.startsWith("https://")
            ? { image_url: cover }
            : {}),
          merchant_url: merchantPath,
        },
      },
      {
        type: "broker_fee",
        description: "Platform broker fee",
        schedule: [
          {
            amount: platformFee,
            payer_customer: sellerEmail,
            beneficiary_customer: "me",
          },
        ],
      },
    ],
  };
}
