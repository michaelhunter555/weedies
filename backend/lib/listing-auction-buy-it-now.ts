/** Live-auction buy-it-now price in dollars, or null when not offered. */
export function auctionBuyItNowPriceDollars(listing: {
  buyItNowPrice?: number;
  startingPrice?: number;
}): number | null {
  const buyItNow = Number(listing.buyItNowPrice);
  if (!Number.isFinite(buyItNow) || buyItNow <= 0) return null;
  const starting = Number(listing.startingPrice ?? 0);
  if (buyItNow < starting) return null;
  return buyItNow;
}

export function hasAuctionBuyItNow(listing: {
  buyItNowPrice?: number;
  startingPrice?: number;
}): boolean {
  return auctionBuyItNowPriceDollars(listing) != null;
}
