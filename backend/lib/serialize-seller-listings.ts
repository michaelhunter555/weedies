import type mongoose from "mongoose";
import Listing from "../models/listing";
import { attachAuctionSummary, countPendingAuctionBids } from "./listing-auction-summary";
import {
  mapListingIdsToBuyerBlocked,
  sellerCanEditListingFields,
} from "./listing-seller-edit";
import { auctionBidsClientJson } from "./listing-auction-bids-client";
import { enrichPendingPrivateListingRequests } from "./enrich-private-listing-requests";

type ListingDoc = InstanceType<typeof Listing>;

export async function serializeSellerListings(listings: ListingDoc[]) {
  const ids = listings.map((l) => l._id as mongoose.Types.ObjectId);
  const blockedMap = await mapListingIdsToBuyerBlocked(ids);

  return Promise.all(
    listings.map(async (l) => {
      const o = l.toObject() as Record<string, unknown>;
      const hasBuyerBlockingTx = blockedMap.get(String(l._id)) ?? false;
      const gate = sellerCanEditListingFields({
        status: l.status,
        openBidCount: l.openBidCount,
        hasBuyerBlockingTx,
      });
      const pendingPrivateListingRequests = await enrichPendingPrivateListingRequests(
        l.pendingPrivateListingRequests as Parameters<
          typeof enrichPendingPrivateListingRequests
        >[0],
      );
      const base = {
        ...o,
        sellerCanEdit: gate.ok,
        pendingPrivateListingRequests,
      };
      if (l.saleType === "auction") {
        const summarized = attachAuctionSummary(base);
        return {
          ...summarized,
          auctionPendingBidCount: countPendingAuctionBids(l.auctionBids),
          auctionBids: auctionBidsClientJson(l.auctionBids),
        };
      }
      return base;
    }),
  );
}
