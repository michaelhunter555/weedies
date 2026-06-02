import mongoose from "mongoose";
import Listing from "../models/listing";
import { isAuctionWinnerAwaitingPayment } from "./listing-auction-winner";

/** Atomically take a live listing off the market for escrow checkout. */
export async function reserveListingForEscrowBuyer(
  listingId: mongoose.Types.ObjectId | string,
  buyerId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const buyerOid = new mongoose.Types.ObjectId(buyerId);

  const reserved = await Listing.findOneAndUpdate(
    { _id: listingId, status: "live" },
    { $set: { status: "reserved", buyerId: buyerOid } },
    { new: true },
  );
  if (reserved) return { ok: true };

  const current = (await Listing.findById(listingId)
    .select("status buyerId")
    .lean()) as { status?: string; buyerId?: unknown } | null;
  if (
    current?.status === "reserved" &&
    current.buyerId &&
    String(current.buyerId) === buyerId
  ) {
    return { ok: true };
  }

  if (current?.status === "reserved") {
    return {
      ok: false,
      message: "Another buyer is already checking out this listing.",
    };
  }

  return {
    ok: false,
    message: "This listing is not available for purchase.",
  };
}

/**
 * Return a reserved listing to the marketplace after escrow cancel / abandon.
 * Auction winners stay `reserved` with `buyerId` so they can pay via Stripe or retry Escrow.
 */
export async function releaseListingEscrowReserve(
  listingId: mongoose.Types.ObjectId | string,
  buyerId: string,
): Promise<void> {
  const listing = (await Listing.findById(listingId)
    .select("saleType status buyerId auctionWinningAmount auctionFinalizedAt")
    .lean()) as Parameters<typeof isAuctionWinnerAwaitingPayment>[0];

  if (isAuctionWinnerAwaitingPayment(listing)) {
    return;
  }

  await Listing.findOneAndUpdate(
    {
      _id: listingId,
      status: "reserved",
      buyerId: new mongoose.Types.ObjectId(buyerId),
    },
    { $set: { status: "live" }, $unset: { buyerId: "" } },
  );
}
