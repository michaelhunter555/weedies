import type { Listing } from "../../types";

export type PendingPrivateAccessRequest = NonNullable<
  Listing["pendingPrivateListingRequests"]
>[number];

export function getPendingPrivateAccessRequests(
  listing?: Listing | null,
): PendingPrivateAccessRequest[] {
  if (!listing?.pendingPrivateListingRequests?.length) return [];
  return listing.pendingPrivateListingRequests.filter(
    (r) => String(r.status ?? "pending").toLowerCase() === "pending",
  );
}

export function countPendingPrivateAccessRequests(listing?: Listing | null): number {
  return getPendingPrivateAccessRequests(listing).length;
}

export function requesterLabel(req: PendingPrivateAccessRequest): string {
  return req.requester?.name?.trim() || "User";
}

export function requesterRegionLabel(req: PendingPrivateAccessRequest): string {
  if (req.requester?.regionLabel) return req.requester.regionLabel;
  if (req.requester?.locale) return req.requester.locale;
  if (req.requester?.timezone) return req.requester.timezone;
  return "—";
}
