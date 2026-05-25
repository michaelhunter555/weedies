/** Standard listing fee after the free tier (USD). */
export const FLAT_LISTING_FEE_USD = 2.99;

/** Optional private-listing add-on (USD). */
export const PRIVATE_LISTING_FEE_USD = 4.99;

/** New sellers get this many listings without the standard listing fee. */
export const FREE_LISTINGS_COUNT = 3;

/** Base listing fee from how many listings the seller has already submitted. */
export function computeListingBaseFeeUsd(priorListings: number): number {
  const n = Number(priorListings);
  if (!Number.isFinite(n) || n < FREE_LISTINGS_COUNT) return 0;
  return FLAT_LISTING_FEE_USD;
}

export function computeListingFeeUsd(
  priorListings: number,
  isPrivateListing: boolean,
): number {
  return (
    computeListingBaseFeeUsd(priorListings) +
    (isPrivateListing ? PRIVATE_LISTING_FEE_USD : 0)
  );
}
