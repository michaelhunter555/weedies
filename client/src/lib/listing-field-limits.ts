/** Listing form limits (aligned with MongoDB `Listing` schema). */
export const LISTING_APP_NAME_MIN = 2;
export const LISTING_APP_NAME_MAX = 80;
export const LISTING_TAGLINE_MIN = 6;
export const LISTING_TAGLINE_MAX = 80;

export function isListingAppNameValid(value: string): boolean {
  const len = value.trim().length;
  return len >= LISTING_APP_NAME_MIN && len <= LISTING_APP_NAME_MAX;
}

export function isListingTaglineValid(value: string): boolean {
  const len = value.trim().length;
  return len >= LISTING_TAGLINE_MIN && len <= LISTING_TAGLINE_MAX;
}

export function listingFieldCharCountLabel(
  currentLength: number,
  max: number,
  min?: number,
): string {
  const count = `${currentLength} / ${max} characters`;
  return min != null ? `${count} (min ${min})` : count;
}
