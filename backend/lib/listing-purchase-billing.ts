/** Marketplace listing checkout rows in `Transaction` (Stripe or Escrow). */
export const LISTING_PURCHASE_STRIPE = "Listing purchase";
export const LISTING_PURCHASE_ESCROW = "Listing purchase (Escrow)";

export const LISTING_PURCHASE_BILLING_REASONS = [
  LISTING_PURCHASE_STRIPE,
  LISTING_PURCHASE_ESCROW,
] as const;

export function isListingPurchaseBillingReason(
  reason: string | undefined | null,
): boolean {
  const r = (reason ?? "").trim();
  return (
    r === LISTING_PURCHASE_STRIPE ||
    r === LISTING_PURCHASE_ESCROW
  );
}

/** Escrow.com dashboard URL for parties to agree / pay / inspect. */
export function escrowWebTransactionUrl(escrowTransactionId: string): string {
  const base =
    process.env.ESCROW_WEB_ORIGIN?.trim() || "https://www.escrow-sandbox.com";
  return `${base.replace(/\/$/, "")}/transaction/${encodeURIComponent(
    escrowTransactionId,
  )}`;
}
