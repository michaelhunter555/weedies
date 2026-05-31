import type { Request, Response } from "express";
import mongoose from "mongoose";

import { io } from "../../app";
import { uploadBufferToCloudinary } from "../../lib/cloudinary";
import { initialDisputeStatus } from "../../lib/dispute-status";
import { serializeDispute } from "../../lib/serialize-dispute";
import { SocketEvents } from "../../lib/socket-events";
import Dispute from "../../models/disputes";
import Listing from "../../models/listing";
import ListingExchange from "../../models/exchange";
import Transaction from "../../models/transactions";
import User from "../../models/user";
import stripe from "../../utils/stripe";
import { isListingPurchaseBillingReason } from "../../lib/listing-purchase-billing";
import {
  disputeRequiresReviewEmail,
  userDisputeNotificationEmail,
} from "../../lib/email-notifications";
const VALID_CATEGORIES = [
  "no_show",
  "service_not_provided",
  "unsafe_environment",
  "incorrect_charge_amount",
  "client_behavoir",
  "seller_behavoir",
] as const;

const VALID_DESIRED = ["full_refund", "partial_refund"] as const;

/**
 * POST /api/disputes (multipart)
 * Buyer opens a dispute on a listing purchase from the exchange room.
 */
export async function createDispute(req: Request, res: Response) {
  const uid = req.user?.userId;
  if (!uid) {
    return void res.status(401).json({ message: "Unauthorized", ok: false });
  }

  const transactionId =
    typeof req.body?.transactionId === "string"
      ? req.body.transactionId.trim()
      : "";
  const category = String(req.body?.category ?? "").trim();
  const disputeExplanation = String(req.body?.disputeExplanation ?? "").trim();
  const desiredAction = String(req.body?.desiredAction ?? "").trim();
  const requestedRefundAmountRaw = Number(req.body?.requestedRefundAmount);

  if (!transactionId || !mongoose.isValidObjectId(transactionId)) {
    return void res.status(400).json({
      message: "A valid transactionId is required.",
      ok: false,
    });
  }
  if (!VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number])) {
    return void res.status(400).json({ message: "Invalid category.", ok: false });
  }
  if (!disputeExplanation || disputeExplanation.length < 10) {
    return void res.status(400).json({
      message: "Please provide an explanation (at least 10 characters).",
      ok: false,
    });
  }
  if (!VALID_DESIRED.includes(desiredAction as (typeof VALID_DESIRED)[number])) {
    return void res.status(400).json({
      message: "desiredAction must be full_refund or partial_refund.",
      ok: false,
    });
  }

  try {
    const existing = await Dispute.findOne({ transactionId });
    if (existing) {
      return void res.status(400).json({
        message: "A dispute already exists for this transaction.",
        ok: false,
      });
    }

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return void res.status(404).json({
        message: "Transaction not found.",
        ok: false,
      });
    }

    if(transaction.paymentType === 'escrow' && transaction.escrowTransactionId) {
      return void res.status(400).json({ message: "Post sale disputes are not available for escrow transactions. Please contact support.", ok: false });
    }

    if (String(transaction.customerId) !== uid) {
      return void res.status(403).json({ message: "Forbidden.", ok: false });
    }

    if (!isListingPurchaseBillingReason(transaction.billingReason)) {
      return void res.status(400).json({
        message: "Disputes are only available for marketplace purchases.",
        ok: false,
      });
    }

    const seller = (await User.findById(transaction.sellerId)
      .select("name email")
      .lean()) as { name?: string; email?: string } | null;
    if (!seller) {
      return void res.status(404).json({ message: "Seller not found.", ok: false });
    }

    const buyer = (await User.findById(uid).select("name email").lean()) as {
      name?: string;
      email?: string;
    } | null;

    const files = req.files as { [field: string]: Express.Multer.File[] } | undefined;
    let imageOne = "";
    let imageTwo = "";
    if (files?.imageOne?.[0]) {
      const up = await uploadBufferToCloudinary(
        files.imageOne[0].buffer,
        files.imageOne[0].mimetype,
        "disputes",
      );
      imageOne = up.secure_url;
    }
    if (files?.imageTwo?.[0]) {
      const up = await uploadBufferToCloudinary(
        files.imageTwo[0].buffer,
        files.imageTwo[0].mimetype,
        "disputes",
      );
      imageTwo = up.secure_url;
    }

    const amountPaidCents = Number(transaction.amountPaid ?? 0);
    let requestedRefundAmount = 0;
    if (desiredAction === "full_refund") {
      requestedRefundAmount = amountPaidCents;
    } else {
      requestedRefundAmount = Math.round(requestedRefundAmountRaw);
      if (
        !Number.isFinite(requestedRefundAmount) ||
        requestedRefundAmount <= 0 ||
        requestedRefundAmount > amountPaidCents ||
        requestedRefundAmount % 100 !== 0
      ) {
        return void res.status(400).json({
          message:
            "Partial refund must be a whole-dollar amount between $1 and the amount paid.",
          ok: false,
        });
      }
    }

    const listing = (await Listing.findById(transaction.ListingId)
      .select("appName")
      .lean()) as { appName?: string } | null;
    const listingAppName = listing?.appName?.trim() || "Listing";

    const disputeStatus = initialDisputeStatus(
      category as (typeof VALID_CATEGORIES)[number],
      "user",
    );

    const dispute = await Dispute.create({
      userId: new mongoose.Types.ObjectId(uid),
      sellerId: transaction.sellerId,
      listingId: transaction.ListingId,
      transactionId: transaction._id,
      disputeExplanation,
      disputeDate: new Date(),
      initiator: uid === transaction.sellerId ? "seller" : "user", // user or seller
      initiatorName: uid === transaction.sellerId ? String(seller.name ?? "Seller") : String(buyer?.name ?? "Buyer"), // could be seller too (no show?)
      amountPaid: amountPaidCents,
      stripePaymentIntentId: transaction.stripePaymentIntentId,
      sellerName: String(seller.name ?? "Seller"),
      sellerResponse: "",
      imageOne,
      imageTwo,
      category,
      disputeStatus,
      action: "pending",
      platformResponse: "",
      desiredAction,
      requestedRefundAmount,
    });

    const isPartialRefund = desiredAction === "partial_refund";

    if (transaction.stripePaymentIntentId) {
      await stripe.paymentIntents.update(transaction.stripePaymentIntentId, {
        metadata: {
          dispute_id: String(dispute._id),
          isDispute: "true",
          partialRefund: String(isPartialRefund),
          transactionId: String(transaction._id),
          reason: category,
        },
      });
    }

    transaction.hasDispute = true;
    transaction.disputeStartDate = dispute.disputeDate;
    transaction.disputeId = dispute._id as mongoose.Types.ObjectId;
    if (!transaction.serviceFee) {
      transaction.serviceFee = 0;
    }
    await transaction.save();

    await ListingExchange.updateOne(
      { listingId: transaction.ListingId },
      {
        $set: {
          paymentStatus: "disputed",
        },
      },
    );

    if (category !== "incorrect_charge_amount") {
      io.to(String(transaction.sellerId)).emit(SocketEvents.DISPUTE_OPENED, {
        message: "A dispute was opened on your sale",
        description: "Your response is needed in Resolution center.",
        disputeId: String(dispute._id),
        listingId: String(transaction.ListingId),
      });

      const sellerIsInitiator = uid === String(transaction.sellerId);
      const notifyEmail = sellerIsInitiator
        ? String(buyer?.email ?? "")
        : String(seller.email ?? "");
      const notifyName = sellerIsInitiator
        ? String(buyer?.name ?? "Buyer")
        : String(seller.name ?? "Seller");
      const notifyUserId = sellerIsInitiator
        ? String(transaction.customerId)
        : String(transaction.sellerId);

      await userDisputeNotificationEmail(
        notifyEmail,
        notifyName,
        notifyUserId,
        String(dispute._id),
        amountPaidCents,
        requestedRefundAmount,
        desiredAction as "full_refund" | "partial_refund",
        dispute.disputeDate,
        category,
        listingAppName,
      );
    } else {
      await disputeRequiresReviewEmail(
        String(dispute._id),
        listingAppName,
        category,
        dispute.initiatorName,
        amountPaidCents,
        requestedRefundAmount,
        desiredAction as "full_refund" | "partial_refund",
      );
    }


    return void res.status(201).json({
      ok: true,
      dispute: serializeDispute(dispute),
      disputeId: String(dispute._id),
    });
  } catch (err) {
    console.error("createDispute:", err);
    return void res.status(500).json({
      message: "Failed to create dispute.",
      ok: false,
    });
  }
}
