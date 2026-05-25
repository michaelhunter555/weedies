export const PLACEHOLDER_APP_COVER = "/placeholder-app-cover.svg";

/** True when the URL can be used as an <img src> (http(s) or same-origin path). */
export function isValidListingPhotoUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return false;
  return (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("/")
  );
}

type ListingWithPhotos = {
  photos?: string[];
  coverIndex?: number;
};

/**
 * Pick the best cover image for a listing, skipping empty/invalid entries
 * (e.g. failed uploads, private listings with cleared photos, bad coverIndex).
 */
export function resolveListingCoverUrl(
  listing?: ListingWithPhotos | null,
): string {
  const photos = listing?.photos ?? [];
  if (!photos.length) return PLACEHOLDER_APP_COVER;

  const preferred = Math.min(
    Math.max(0, listing?.coverIndex ?? 0),
    Math.max(0, photos.length - 1),
  );
  const ordered = [...photos.slice(preferred), ...photos.slice(0, preferred)];
  const match = ordered.find(isValidListingPhotoUrl);
  return match?.trim() ?? PLACEHOLDER_APP_COVER;
}
