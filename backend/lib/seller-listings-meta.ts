import mongoose from "mongoose";
import Listing from "../models/listing";

export type SellerListingStatusFilter = "active" | "sold" | "all";

export function sellerListingStatusQuery(
  status: SellerListingStatusFilter,
): Record<string, unknown> {
  if (status === "active") {
    return { status: { $nin: ["sold", "removed"] } };
  }
  if (status === "sold") {
    return { status: "sold" };
  }
  return {};
}

export async function getSellerListingsMeta(sellerId: string) {
  const sid = new mongoose.Types.ObjectId(sellerId);

  const [totalActive, totalSold, pendingCandidates] = await Promise.all([
    Listing.countDocuments({
      sellerId: sid,
      ...sellerListingStatusQuery("active"),
    }),
    Listing.countDocuments({ sellerId: sid, status: "sold" }),
    Listing.find({
      sellerId: sid,
      status: { $nin: ["sold", "removed"] },
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

  return { totalActive, totalSold, pendingPrivateAccessTotal };
}
