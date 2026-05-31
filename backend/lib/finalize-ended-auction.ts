import mongoose from "mongoose";

import { io } from "../app";
import {
  auctionEndedNoWinnerSellerEmail,
  auctionWinnerBuyerEmail,
  auctionWinnerSellerEmail,
} from "./email-notifications";
import {
  markWinningBidAccepted,
  pickAuctionWinningBid,
} from "./auction-pick-winner";
import { SocketEvents } from "./socket-events";

const { AUCTION_ENDED } = SocketEvents;
import Listing from "../models/listing";
import ListingExchange from "../models/exchange";
import User from "../models/user";

export type FinalizeAuctionResult =
  | { outcome: "no_bids" }
  | { outcome: "winner_missing" }
  | { outcome: "reserved"; listingId: string; buyerId: string; amount: number }
  | { outcome: "skipped" };

/**
 * End a live auction: reserve for the high bidder (payment in exchange / checkout).
 * Does not mark the listing sold — that happens after payment succeeds.
 */
export async function finalizeEndedAuction(
  listingId: mongoose.Types.ObjectId | string,
): Promise<FinalizeAuctionResult> {
  const now = new Date();
  const listing = await Listing.findOne({
    _id: listingId,
    saleType: "auction",
    status: "live",
    auctionEndDate: { $lte: now },
  });

  if (!listing) return { outcome: "skipped" };

  const bids = listing.auctionBids ?? [];
  const winner = pickAuctionWinningBid(bids);

  if (!winner?.bidderId) {
    listing.auctionFinalizedAt = now;
    listing.expiredAt = now;
    listing.status = "expired";
    await listing.save();

    const seller = (await User.findById(listing.sellerId)
      .select("email name")
      .lean()) as { email?: string; name?: string } | null;
    if (seller?.email) {
      await auctionEndedNoWinnerSellerEmail(
        String(seller.email),
        String(seller.name ?? "Seller"),
        String(listing.appName ?? "Listing"),
        String(listing._id),
        listing.slug,
      );
    }

    io.to(String(listing.sellerId)).emit(AUCTION_ENDED, {
      message: `Auction ended with no winning bid for "${listing.appName}"`,
      listingId: String(listing._id),
      outcome: "no_bids",
    });

    return { outcome: "no_bids" };
  }

  const buyerId = new mongoose.Types.ObjectId(String(winner.bidderId));
  const buyer = (await User.findById(buyerId).select("email name").lean()) as {
    email?: string;
    name?: string;
    _id?: unknown;
  } | null;

  if (!buyer?.email) {
    listing.auctionFinalizedAt = now;
    listing.expiredAt = now;
    listing.status = "expired";
    await listing.save();

    const seller = (await User.findById(listing.sellerId)
      .select("email name")
      .lean()) as { email?: string; name?: string } | null;
    if (seller?.email) {
      await auctionEndedNoWinnerSellerEmail(
        String(seller.email),
        String(seller.name ?? "Seller"),
        String(listing.appName ?? "Listing"),
        String(listing._id),
        listing.slug,
        "The high bidder's account is no longer available.",
      );
    }

    io.to(String(listing.sellerId)).emit(AUCTION_ENDED, {
      message: `Auction ended but the winning bidder could not be reached for "${listing.appName}"`,
      listingId: String(listing._id),
      outcome: "winner_missing",
    });

    return { outcome: "winner_missing" };
  }

  const winAmount = Number(winner.amount) || 0;
  markWinningBidAccepted(bids, winner);
  listing.auctionBids = bids;
  listing.auctionFinalizedAt = now;
  listing.auctionWinningAmount = winAmount;
  listing.status = "reserved";
  listing.buyerId = buyerId;
  await listing.save();

  await ListingExchange.updateOne(
    { listingId: listing._id },
    {
      $set: {
        sellerId: listing.sellerId,
        buyerId,
        paymentStatus: "pending",
        sellerCapturedPayment: false,
      },
      $setOnInsert: { deliverables: [] },
    },
    { upsert: true },
  );

  const listingIdStr = String(listing._id);
  const seller = (await User.findById(listing.sellerId)
    .select("email name")
    .lean()) as { email?: string; name?: string; _id?: unknown } | null;
  const checkoutUrl = `${clientOrigin()}/checkout/${encodeURIComponent(listingIdStr)}`;
  const exchangeUrl = `${clientOrigin()}/exchange/${encodeURIComponent(listingIdStr)}`;

  await auctionWinnerBuyerEmail(
    String(buyer.email),
    String(buyer.name ?? "Buyer"),
    String(buyer._id),
    String(listing.appName ?? "Listing"),
    listingIdStr,
    winAmount,
    checkoutUrl,
    exchangeUrl,
  );

  if (seller?.email) {
    await auctionWinnerSellerEmail(
      String(seller.email),
      String(seller.name ?? "Seller"),
      String(seller._id),
      String(listing.appName ?? "Listing"),
      listingIdStr,
      winAmount,
      String(buyer.name ?? "Buyer"),
      exchangeUrl,
    );
  }

  const payload = {
    listingId: listingIdStr,
    outcome: "reserved" as const,
    amount: winAmount,
    appName: String(listing.appName ?? "Listing"),
  };

  io.to(String(buyer._id)).emit(AUCTION_ENDED, {
    message: `You won the auction for "${listing.appName}" — complete payment to continue`,
    ...payload,
  });
  io.to(String(listing.sellerId)).emit(AUCTION_ENDED, {
    message: `Auction ended — high bidder must complete payment for "${listing.appName}"`,
    ...payload,
  });

  return {
    outcome: "reserved",
    listingId: listingIdStr,
    buyerId: String(buyer._id),
    amount: winAmount,
  };
}

function clientOrigin(): string {
  const raw = process.env.CLIENT_ORIGIN?.trim();
  if (raw) {
    const first = raw.split(",")[0]?.trim();
    if (first) return first.replace(/\/$/, "");
  }
  return "https://dapandflip.com";
}
