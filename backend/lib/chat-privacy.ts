import type { ParticipantRole } from "../models/conversations";

/**
 * Public label for the thread starter before the recipient has replied (listing threads only).
 * Example: `Cool App · buyer` or `Cool App · seller`.
 */
export function maskLabelForListingThread(
  listingAppName: string,
  initiatorRole: ParticipantRole,
): string {
  const app = listingAppName.trim() || "Listing";
  if (initiatorRole === "seller") return `${app} · seller`;
  if (initiatorRole === "admin") return `${app} · support`;
  return `${app} · buyer`;
}
