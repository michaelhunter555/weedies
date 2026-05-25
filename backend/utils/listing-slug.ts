import Listing from "../models/listing";

export function slugifyAppName(name: string): string {
  const s = String(name || "app")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return s || "listing";
}

export async function ensureUniqueListingSlug(
  base: string,
  excludeListingId?: string,
): Promise<string> {
  let slug = base || "listing";
  let suffix = 0;
  for (;;) {
    const conflictFilter = excludeListingId
      ? { slug, _id: { $ne: excludeListingId } }
      : { slug };
    // eslint-disable-next-line no-await-in-loop
    if (!(await Listing.exists(conflictFilter))) return slug;
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
}
