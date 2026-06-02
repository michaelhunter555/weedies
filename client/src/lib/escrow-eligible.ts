/** $1,000–$3,999.99: Stripe or Escrow. $4,000+: Escrow only (buy-it-now and auction winners). */
export const ESCROW_ELIGIBLE_MIN_PRICE_DOLLARS = 1000;
export const ESCROW_REQUIRED_MIN_PRICE_DOLLARS = 4000;

export function isEscrowEligiblePrice(priceDollars: number): boolean {
  return (
    Number.isFinite(priceDollars) &&
    priceDollars >= ESCROW_ELIGIBLE_MIN_PRICE_DOLLARS
  );
}

export function isEscrowRequiredPrice(priceDollars: number): boolean {
  return (
    Number.isFinite(priceDollars) &&
    priceDollars >= ESCROW_REQUIRED_MIN_PRICE_DOLLARS
  );
}
