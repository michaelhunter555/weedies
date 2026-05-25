/** Parse checkbox / JSON body values into a strict boolean. */
export function parsePrivateListingFlag(raw: unknown): boolean {
  if (raw === true || raw === "true" || raw === 1 || raw === "1") return true;
  return false;
}

/** Optional non-negative number (revenue, MAU, etc.). */
export function parseOptionalNonNegNumber(raw: unknown): number | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}
