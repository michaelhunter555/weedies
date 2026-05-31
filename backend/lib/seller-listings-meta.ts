import mongoose from "mongoose";
import Listing from "../models/listing";
import {
  sellerListingActiveQuery,
  sellerListingExpiredQuery,
} from "./seller-listing-expired";

export type SellerListingStatusFilter = "active" | "sold" | "expired" | "all";

export function sellerListingStatusQuery(
  status: SellerListingStatusFilter,
): Record<string, unknown> {
  if (status === "active") {
    return sellerListingActiveQuery();
  }
  if (status === "sold") {
    return { status: "sold" };
  }
  if (status === "expired") {
    return sellerListingExpiredQuery();
  }
  return {};
}

export async function getSellerListingsMeta(sellerId: string) {
  const sid = new mongoose.Types.ObjectId(sellerId);

  const [totalActive, totalSold, totalExpired, pendingCandidates] =
    await Promise.all([
      Listing.countDocuments({
        sellerId: sid,
        ...sellerListingActiveQuery(),
      }),
      Listing.countDocuments({ sellerId: sid, status: "sold" }),
      Listing.countDocuments({
        sellerId: sid,
        ...sellerListingExpiredQuery(),
      }),
      Listing.find({
        sellerId: sid,
        status: { $nin: ["sold", "removed", "expired"] },
        pendingPrivateListingRequests: { $elemMatch: { status: "pending" } },
      })
        .select("pendingPrivateListingRequests")
        .lean(),
    ]);

  let pendingPrivateAccessTotal = 0;
  for (const row of pendingCandidates) {
    const requests = row.pendingPrivateListingRequests ?? [];
    pendingPrivateAccessTotal += requests.filter(
      (r: { status?: string }) => r.status === "pending",
    ).length;
  }

  return { totalActive, totalSold, totalExpired, pendingPrivateAccessTotal };
}
