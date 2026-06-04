import mongoose from "mongoose";

import { AccountStatus } from "../../types/account-status";
import PayoutBatch from "../../models/payoutBatch";
import Transaction from "../../models/transactions";
import stripe from "../../utils/stripe";

/** Hold after buyer confirms receipt (dispute window before Connect payout). */
const PAYOUT_HOLD_MS = 24 * 60 * 60 * 1000;

/** Minimum Stripe payout amount in cents ($1.00). */
const MIN_PAYOUT_CENTS = 100;

type SellerPayoutGroup = {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  stripeConnectAccountId: string;
  transactions: mongoose.Types.ObjectId[];
  sellerNetTotal: number;
};

/**
 * Bi-weekly seller payouts (Connect Express).
 * Groups unpaid Stripe `Listing purchase` transactions by seller only when
 * the buyer confirmed receipt on the exchange, then skips restricted accounts.
 */
export default async function initiatePayout(): Promise<void> {
  try {
    const buyerConfirmCutoff = new Date(Date.now() - PAYOUT_HOLD_MS);

    const groups = (await Transaction.aggregate([
      {
        $match: {
          hasDispute: { $ne: true },
          paidOut: { $ne: true },
          paymentStatus: "succeeded",
          stripePaymentIntentId: { $exists: true, $ne: null },
          billingReason: "Listing purchase",
        },
      },
      {
        $lookup: {
          from: "listingexchanges",
          localField: "ListingId",
          foreignField: "listingId",
          as: "exchange",
        },
      },
      { $unwind: "$exchange" },
      {
        $match: {
          "exchange.buyerConfirmedAt": { $exists: true, $ne: null, $lte: buyerConfirmCutoff },
          "exchange.paymentStatus": {
            $nin: ["canceled", "cancelled", "failed", "disputed"],
          },
        },
      },
      {
        $addFields: {
          sellerNetCents: {
            $max: [
              0,
              { $subtract: ["$amountPaid", { $ifNull: ["$serviceFee", 0] }] },
            ],
          },
        },
      },
      { $match: { sellerNetCents: { $gt: 0 } } },
      {
        $lookup: {
          from: "users",
          localField: "sellerId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $match: {
          "user.accountStanding": AccountStatus.GOOD,
          "user.stripeConnectAccountId": { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$sellerId",
          name: { $first: "$user.name" },
          email: { $first: "$user.email" },
          stripeConnectAccountId: { $first: "$user.stripeConnectAccountId" },
          transactions: { $push: "$_id" },
          sellerNetTotal: { $sum: "$sellerNetCents" },
        },
      },
    ])) as SellerPayoutGroup[];

    let payoutsCreated = 0;

    for (const [i, group] of groups.entries()) {
      const sellerId = String(group._id);
      const stripeConnectAccountId = String(group.stripeConnectAccountId ?? "");

      if (!stripeConnectAccountId) {
        console.log("❌ No Connect account for seller:", sellerId);
        continue;
      }

      const balance = await stripe.balance.retrieve({
        stripeAccount: stripeConnectAccountId,
      });
      const totalAvailable = balance.available?.find((b) => b.currency === "usd");

      if (!totalAvailable || totalAvailable.amount <= 0) {
        console.log("❌ No available USD balance for seller:", sellerId);
        continue;
      }

      const owedCents = Math.floor(group.sellerNetTotal);
      const payoutCap = Math.min(totalAvailable.amount, owedCents);

      if (payoutCap < MIN_PAYOUT_CENTS) {
        console.log("⚠️ Payout below minimum for seller:", sellerId, payoutCap);
        continue;
      }

      console.log(
        `payout#${i}`,
        "seller:",
        sellerId,
        "owed (cents):",
        owedCents,
        "cap:",
        payoutCap,
      );

      const orderedTransactions = await Transaction.find({
        _id: { $in: group.transactions },
      })
        .select("_id amountPaid serviceFee")
        .sort({ createdAt: 1 });

      let remainingAmount = payoutCap;
      const paidTransactions: mongoose.Types.ObjectId[] = [];

      for (const tx of orderedTransactions) {
        if (remainingAmount <= 0) break;
        const net = Math.max(
          0,
          Number(tx.amountPaid ?? 0) - Number(tx.serviceFee ?? 0),
        );
        if (net <= 0) continue;
        if (remainingAmount >= net) {
          paidTransactions.push(tx._id);
          remainingAmount -= net;
        } else {
          console.log(
            `Partial payout: $${(remainingAmount / 100).toFixed(2)} left, tx ${tx._id} skipped`,
          );
          break;
        }
      }

      if (paidTransactions.length === 0) {
        console.log("❌ No transactions covered for seller:", sellerId);
        continue;
      }

      const batchAmount = payoutCap - remainingAmount;
      if (batchAmount < MIN_PAYOUT_CENTS) {
        continue;
      }

      const batchPayout = await PayoutBatch.create({
        sellerId: group._id,
        transactions: paidTransactions,
        amount: batchAmount,
        status: "pending",
        stripePayoutId: null,
        payoutDate: null,
        currency: "usd",
      });

      await stripe.payouts.create(
        {
          amount: batchAmount,
          currency: "usd",
          metadata: {
            sellerId,
            sellerName: String(group.name ?? "Seller"),
            sellerEmail: String(group.email ?? ""),
            batchPayoutId: String(batchPayout._id),
          },
        },
        {
          stripeAccount: stripeConnectAccountId,
          idempotencyKey: `${String(batchPayout._id)}:payout`,
        },
      );

      payoutsCreated += 1;
    }

    console.log(
      "Cron completed: payouts initiated for",
      payoutsCreated,
      "of",
      groups.length,
      "seller groups",
    );
  } catch (err) {
    console.error("Cron failed: initiatePayout", err);
  }
}
