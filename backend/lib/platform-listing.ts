/** Platform-owned listings: sold by the platform, not via Connect payouts to a seller. */
export function isPlatformManagedListing(
  listing: { isPlatformListing?: boolean | null } | null | undefined,
): boolean {
  return listing?.isPlatformListing === true;
}

export function isMarketplacePurchasePaymentType(
  paymentType: string | undefined | null,
): boolean {
  return paymentType === "asset-sale" || paymentType === "platform-sale";
}

