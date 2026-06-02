import mongoose from "mongoose";

import { io } from "../app";
import Listing from "../models/listing";
import ListingExchange from "../models/exchange";
import Transaction from "../models/transactions";
import User from "../models/user";
import { checkRoom } from "../utils/check-socket-room";
import { isAuctionWithWinnerOutcome } from "./listing-auction-winner";
import { releaseListingEscrowReserve } from "./listing-reserve";

const PURCHASE_SUCCEEDED = "stripe.payment.succeeded";
const PURCHASE_CANCELED = "stripe.payment.canceled";

export type FinalizeEscrowPurchaseInput = {
  listingId: string;
  buyerId: string;
  sellerId: string;
  escrowTransactionId: string;
  amountCents: number;
  serviceFeeCents: number;
  currency?: string;
  paymentStatus: "pending" | "succeeded";
};

/**
 * Mark listing sold and upsert exchange after Escrow funds are approved.
 * Idempotent when the listing is already sold to the same buyer.
 */
export async function finalizeEscrowListingPurchase(
  input: FinalizeEscrowPurchaseInput,
): Promise<{ transactionId: string; listingAppName: string } | null> {
  const {
    listingId,
    buyerId,
    sellerId,
    escrowTransactionId,
    amountCents,
    serviceFeeCents,
    currency = "usd",
    paymentStatus,
  } = input;

  const listingPre = await Listing.findById(listingId).select("status buyerId appName");
  if (!listingPre) return null;

  if (
    listingPre.status === "sold" &&
    listingPre.buyerId &&
    String(listingPre.buyerId) === buyerId
  ) {
    const existing = await Transaction.findOne({
      escrowTransactionId: String(escrowTransactionId),
    });
    if (existing) {
      if (existing.paymentStatus !== paymentStatus) {
        existing.paymentStatus = paymentStatus;
        await existing.save();
      }
      await ListingExchange.updateOne(
        { listingId: listingPre._id },
        {
          $set: {
            paymentStatus: paymentStatus === "succeeded" ? "succeeded" : "pending",
            sellerCapturedPayment: paymentStatus === "succeeded",
            ...(paymentStatus === "succeeded"
              ? { paymentReceivedAt: new Date() }
              : {}),
          },
        },
      );
      return {
        transactionId: String(existing._id),
        listingAppName: listingPre.appName ?? "Listing",
      };
    }
  }

  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    const listing = await Listing.findById(listingId).session(dbSession);
    if (!listing) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      return null;
    }

    let transaction = await Transaction.findOne({
      escrowTransactionId: String(escrowTransactionId),
    }).session(dbSession);

    if (!transaction) {
      transaction = new Transaction({
        ListingId: listing._id,
        customerId: buyerId,
        sellerId,
        paymentType: "escrow",
        escrowTransactionId: String(escrowTransactionId),
        stripePaymentIntentId: `escrow:${escrowTransactionId}`,
        stripeCustomerId: "",
        amountCharged: amountCents,
        amountPaid: amountCents,
        serviceFee: serviceFeeCents,
        billingReason: "Listing purchase (Escrow)",
        paymentStatus,
        currency,
      });
      await transaction.save({ session: dbSession });
    } else {
      transaction.paymentStatus = paymentStatus;
      transaction.amountCharged = amountCents;
      transaction.amountPaid = amountCents;
      transaction.serviceFee = serviceFeeCents;
      await transaction.save({ session: dbSession });
    }

    if (listing.status !== "sold") {
      listing.status = "sold";
      listing.buyerId = new mongoose.Types.ObjectId(buyerId);
      listing.soldAt = new Date();
      await listing.save({ session: dbSession });

      await User.findByIdAndUpdate(
        sellerId,
        { $inc: { totalSales: 1 } },
        { session: dbSession },
      );
    }

    await ListingExchange.updateOne(
      { listingId: listing._id },
      {
        $set: {
          sellerId: listing.sellerId,
          buyerId: new mongoose.Types.ObjectId(buyerId),
          paymentReceivedAt: new Date(),
          paymentStatus: paymentStatus === "succeeded" ? "succeeded" : "pending",
          sellerCapturedPayment: paymentStatus === "succeeded",
        },
        $setOnInsert: {
          listingId: listing._id,
          deliverables: [],
        },
      },
      { upsert: true, session: dbSession },
    );

    await dbSession.commitTransaction();
    dbSession.endSession();

    const amountFmt = (amountCents / 100).toFixed(2);
    const payload = {
      listingId: String(listing._id),
      transactionId: String(transaction._id),
      amount: amountFmt,
      currency,
      escrowTransactionId: String(escrowTransactionId),
    };

    if (checkRoom(io, String(sellerId))) {
      io.to(String(sellerId)).emit(PURCHASE_SUCCEEDED, {
        ...payload,
        message: `Your listing "${listing.appName}" just sold via Escrow!`,
      });
    }

    if (checkRoom(io, String(buyerId))) {
      io.to(String(buyerId)).emit(PURCHASE_SUCCEEDED, {
        ...payload,
        message: `Escrow payment confirmed for "${listing.appName}"`,
      });
    }

    return {
      transactionId: String(transaction._id),
      listingAppName: listing.appName ?? "Listing",
    };
  } catch (err) {
    await dbSession.abortTransaction();
    dbSession.endSession();
    throw err;
  }
}

export async function cancelEscrowListingPurchase(
  escrowTransactionId: string,
): Promise<void> {
  const transaction = await Transaction.findOne({
    escrowTransactionId: String(escrowTransactionId),
    paymentType: "escrow",
  });
  if (!transaction) return;

  transaction.paymentStatus = "canceled";
  await transaction.save();

  const listing = await Listing.findById(transaction.ListingId).select(
    "status buyerId appName saleType auctionWinningAmount auctionFinalizedAt",
  );
  if (!listing) return;

  const buyerId = String(transaction.customerId);

  if (listing.status === "reserved") {
    await releaseListingEscrowReserve(listing._id, buyerId);
  } else if (
    listing.status === "sold" &&
    listing.buyerId &&
    String(listing.buyerId) === buyerId
  ) {
    if (isAuctionWithWinnerOutcome(listing)) {
      await Listing.findByIdAndUpdate(listing._id, {
        $set: { status: "reserved" },
        $unset: { soldAt: "" },
      });
    } else {
      await Listing.findByIdAndUpdate(listing._id, {
        $set: { status: "live" },
        $unset: { buyerId: "", soldAt: "" },
      });
    }
  }

  await ListingExchange.updateOne(
    { listingId: listing._id },
    { $set: { paymentStatus: "canceled" } },
  );

  if (checkRoom(io, buyerId)) {
    io.to(buyerId).emit(PURCHASE_CANCELED, {
      listingId: String(listing._id),
      escrowTransactionId: String(escrowTransactionId),
      message: `Escrow transaction canceled for "${listing.appName ?? "listing"}"`,
    });
  }
}
