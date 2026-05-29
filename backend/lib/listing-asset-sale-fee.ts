/**
 * Buyer purchase price for fixed-price listings (dollars, not cents).
 */
export function listingBuyItNowPriceDollars(listing: {
  buyItNowPrice?: number;
  startingPrice: number;
}): number {
  return Math.max(0, Number(listing.buyItNowPrice ?? listing.startingPrice ?? 0));
}

/**
 * Success-fee tiers — keep in sync with `client/src/utils/listingOptions.tsx`
 * (`APPLICATION_FEE_TIERS` / `determineApplicationFee`).
 */
const APPLICATION_FEE_TIERS: {
  minPrice: number;
  maxPrice: number | null;
  rate: number;
}[] = [
  { minPrice: 0, maxPrice: 50, rate: 0.2 },
  { minPrice: 50, maxPrice: 1000, rate: 0.1 },
  { minPrice: 1000, maxPrice: 10000, rate: 0.08 },
  { minPrice: 10000, maxPrice: null, rate: 0.06 },
];

/** Platform take as a fraction of the list price (dollars). */
export function platformApplicationFeeRatio(priceDollars: number): number {
  const price = Math.max(0, Number(priceDollars) || 0);
  for (const tier of APPLICATION_FEE_TIERS) {
    if (price >= tier.minPrice && (tier.maxPrice == null || price < tier.maxPrice)) {
      return tier.rate;
    }
  }
  return APPLICATION_FEE_TIERS[APPLICATION_FEE_TIERS.length - 1].rate;
}

/** Application fee in cents for Stripe `application_fee_amount`. */
export function EscrowApplicationFee(priceDollars: number): number {
  return Math.round(priceDollars * platformApplicationFeeRatio(priceDollars));
}

/** Application fee in cents for Stripe `application_fee_amount`. */
export function platformApplicationFeeCents(priceDollars: number): number {
  return Math.round(priceDollars * platformApplicationFeeRatio(priceDollars) * 100);
}
