/** Buyers may choose Escrow.com at or above this price (USD). */
export const ESCROW_ELIGIBLE_MIN_PRICE_DOLLARS = 1000;

/** At or above this price, Stripe checkout is disabled (Escrow only). */
export const ESCROW_REQUIRED_MIN_PRICE_DOLLARS = 4000;

export function isEscrowEligiblePrice(priceDollars: number): boolean {
  return (
    Number.isFinite(priceDollars) &&
    priceDollars >= ESCROW_ELIGIBLE_MIN_PRICE_DOLLARS
  );
}

/** Stripe is not offered; Escrow is required. */
export function isEscrowRequiredPrice(priceDollars: number): boolean {
  return (
    Number.isFinite(priceDollars) &&
    priceDollars >= ESCROW_REQUIRED_MIN_PRICE_DOLLARS
  );
}
