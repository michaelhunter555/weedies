import type { Request, Response } from "express";
import mongoose from "mongoose";

import Disputes from "../../models/disputes";
import ExchangeRooms from "../../models/exchange";
import Listings from "../../models/listing";
import User from "../../models/user";
import stripe from "../../utils/stripe";

const BLOCKING_LISTING_STATUSES = [
  "live",
  "pending_review",
  "reserved",
  "paused",
] as const;

const OPEN_EXCHANGE_STATUSES = ["pending", "disputed"] as const;

/**
 * Permanently deletes the authenticated user's account after safety checks.
 */
export async function deleteUserAccount(req: Request, res: Response) {
  const userId = req.user?.userId;
  if (!userId) {
    return void res.status(401).json({ message: "Unauthorized", ok: false });
  }

  if (!mongoose.isValidObjectId(userId)) {
    return void res.status(400).json({ message: "Invalid user id.", ok: false });
  }

  const userOid = new mongoose.Types.ObjectId(userId);

  try {
    const user = await User.findById(userId);
    if (!user) {
      return void res.status(404).json({ message: "User not found.", ok: false });
    }

    const activeListings = await Listings.exists({
      sellerId: userOid,
      status: { $in: [...BLOCKING_LISTING_STATUSES] },
    });
    if (activeListings) {
      return void res.status(400).json({
        ok: false,
        message:
          "You have active listings. Remove or complete them before closing your account.",
      });
    }

    const openExchange = await ExchangeRooms.exists({
      $or: [{ sellerId: userOid }, { buyerId: userOid }],
      paymentStatus: { $in: [...OPEN_EXCHANGE_STATUSES] },
    });
    if (openExchange) {
      return void res.status(400).json({
        ok: false,
        message:
          "You have an open sale or purchase in progress. Finish or cancel it before closing your account.",
      });
    }

    const openDispute = await Disputes.exists({
      $or: [{ userId: userOid }, { sellerId: userOid }],
      disputeStatus: { $ne: "closed" },
    });
    if (openDispute) {
      return void res.status(400).json({
        ok: false,
        message:
          "You have an open dispute. Resolve it before closing your account.",
      });
    }

    if (Number(user.outstandingBalance ?? 0) > 0) {
      return void res.status(400).json({
        ok: false,
        message:
          "Your account has an outstanding balance. Contact support before closing your account.",
      });
    }

    const connectId = user.stripeConnectAccountId?.trim();
    if (connectId) {
      try {
        const balance = await stripe.balance.retrieve({
          stripeAccount: connectId,
        });
        const availableTotal = (balance.available ?? []).reduce(
          (sum, row) => sum + row.amount,
          0,
        );
        const pendingTotal = (balance.pending ?? []).reduce(
          (sum, row) => sum + row.amount,
          0,
        );
        if (availableTotal + pendingTotal > 0) {
          return void res.status(400).json({
            ok: false,
            message:
              "Your Stripe Connect balance must be zero before you can close your account. Wait for pending payouts first.",
          });
        }

        const deleted = await stripe.accounts.del(connectId);
        if (!deleted.deleted) {
          return void res.status(400).json({
            ok: false,
            message: "Failed to disconnect Stripe. Please try again later.",
          });
        }
      } catch (stripeErr) {
        console.error("deleteUserAccount stripe:", stripeErr);
        return void res.status(400).json({
          ok: false,
          message:
            "We could not verify or disconnect your Stripe account. Try again or contact support.",
        });
      }
    }

    await User.deleteOne({ _id: userOid });

    return void res.status(200).json({
      ok: true,
      message: "Your account has been closed.",
    });
  } catch (err) {
    console.error("deleteUserAccount:", err);
    return void res.status(500).json({
      ok: false,
      message: "Could not close your account. Please try again later.",
    });
  }
}
