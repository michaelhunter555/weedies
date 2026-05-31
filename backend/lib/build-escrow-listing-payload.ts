import type {
  CreateEscrowTransactionRequest,
  EscrowFeeScheduleInput,
} from "./escrow-api";
import { isEscrowRequiredPrice } from "./escrow-eligible";
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
 * Escrow.com service fee (type `escrow`) — not the platform broker line item.
 * @see https://www.escrow.com/api/docs/create-transaction (fees / split)
 *
 * - ≥ $4,000 (required Escrow): buyer and seller each pay 50% (splits sum to 1.0).
 * - $1,000–$3,999.99 (optional Escrow): buyer pays 100%.
 */
function escrowServiceFeeSchedule(
  buyerEmail: string,
  sellerEmail: string,
  priceDollars: number,
): EscrowFeeScheduleInput[] {
  if (isEscrowRequiredPrice(priceDollars)) {
    return [
      { payer_customer: buyerEmail, type: "escrow", split: 0.5 },
      { payer_customer: sellerEmail, type: "escrow", split: 0.5 },
    ];
  }

  return [{ payer_customer: buyerEmail, type: "escrow", split: 1 }];
}

/**
 * Build Escrow.com `POST /transaction` body for a marketplace listing purchase.
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

  const escrowFees = escrowServiceFeeSchedule(
    buyerEmail,
    sellerEmail,
    priceDollars,
  );

  return {
    parties: [
      { role: "broker", customer: "me" },
      { role: "buyer", customer: buyerEmail },
      { role: "seller", customer: sellerEmail },
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
        fees: escrowFees,
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
        fees: escrowFees,
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
