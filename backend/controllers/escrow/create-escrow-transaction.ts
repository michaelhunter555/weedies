import type { Request, Response } from "express";
import mongoose from "mongoose";

import { buildEscrowListingPurchasePayload } from "../../lib/build-escrow-listing-payload";
import {
  createEscrowTransaction as createEscrowTransactionApi,
  EscrowApiError,
  isEscrowApiConfigured,
} from "../../lib/escrow-api";
import { buildEscrowInitResponse } from "../../lib/escrow-init-response";
import { isEscrowEligiblePrice } from "../../lib/escrow-eligible";
import {
  listingBuyItNowPriceDollars,
  platformApplicationFeeCents,
} from "../../lib/listing-asset-sale-fee";
import {
  releaseListingEscrowReserve,
  reserveListingForEscrowBuyer,
} from "../../lib/listing-reserve";
import Listing from "../../models/listing";
import Transaction, { type ITransaction } from "../../models/transactions";
import User from "../../models/user";

/**
 * POST /api/escrow/transaction
 * Body: `{ listingId: string }`
 *
 * Creates an Escrow.com transaction. Buyer continues via Escrow.com email.
 * Webhooks update our order + listing state.
 */
export async function initEscrowTransaction(req: Request, res: Response) {
  try {
    if (!isEscrowApiConfigured()) {
      return void res.status(503).json({
        ok: false,
        message:
          "Escrow is not configured on the server. Set ESCROW_API_EMAIL and ESCROW_API_KEY.",
      });
    }

    const buyerUserId = req.user?.userId;
    if (!buyerUserId) {
      return void res.status(401).json({ ok: false, message: "Unauthorized" });
    }

    const listingIdRaw = (req.body as { listingId?: unknown })?.listingId;
    const listingId =
      typeof listingIdRaw === "string"
        ? listingIdRaw.trim()
        : String(listingIdRaw ?? "");
    if (!mongoose.isValidObjectId(listingId)) {
      return void res.status(400).json({ ok: false, message: "Invalid listing id" });
    }

    const buyer = await User.findById(buyerUserId).select("email stripeCustomerId");
    const buyerEmail = buyer?.email?.trim().toLowerCase();
    if (!buyerEmail) {
      return void res.status(400).json({
        ok: false,
        message: "Your account needs an email address to use Escrow checkout.",
      });
    }

    const listing = await Listing.findById(listingId).select(
      "_id appName tagline slug photos coverIndex status saleType sellerId buyItNowPrice startingPrice currency",
    );
    if (!listing) {
      return void res.status(404).json({ ok: false, message: "Listing not found" });
    }
    if (listing.status !== "live") {
      return void res.status(409).json({
        ok: false,
        message: "This listing is not available for purchase.",
      });
    }
    if (listing.saleType === "auction") {
      return void res.status(400).json({
        ok: false,
        message: "Use the auction flow for this listing.",
      });
    }

    const sellerIdStr = String(listing.sellerId);
    if (sellerIdStr === buyerUserId) {
      return void res.status(400).json({
        ok: false,
        message: "You cannot purchase your own listing.",
      });
    }

    const priceDollars = listingBuyItNowPriceDollars(listing);
    if (!isEscrowEligiblePrice(priceDollars)) {
      return void res.status(400).json({
        ok: false,
        message: `Escrow checkout is only available for purchases of $${1000} or more.`,
      });
    }

    const seller = await User.findById(listing.sellerId).select("email");
    const sellerEmail = seller?.email?.trim().toLowerCase();
    if (!sellerEmail) {
      return void res.status(409).json({
        ok: false,
        message: "The seller must have an email on file before Escrow checkout.",
      });
    }

    const pendingEscrow = (await Transaction.findOne({
      ListingId: listing._id,
      paymentType: "escrow",
      paymentStatus: { $in: ["pending", "succeeded"] },
      customerId: buyerUserId,
    })
      .select("_id escrowTransactionId paymentStatus")
      .lean()) as Pick<ITransaction, "_id" | "escrowTransactionId" | "paymentStatus"> | null;

    if (pendingEscrow?.escrowTransactionId) {
      const reserve = await reserveListingForEscrowBuyer(listing._id, buyerUserId);
      if (!reserve.ok) {
        return void res.status(409).json({ ok: false, message: reserve.message });
      }
      return void res.status(200).json(
        buildEscrowInitResponse({
          escrowTransactionId: pendingEscrow.escrowTransactionId,
          transactionId: String(pendingEscrow._id),
          reused: true,
        }),
      );
    }

    const otherPendingEscrow = await Transaction.findOne({
      ListingId: listing._id,
      paymentType: "escrow",
      paymentStatus: "pending",
      customerId: { $ne: buyerUserId },
    })
      .select("_id")
      .lean();
    if (otherPendingEscrow) {
      return void res.status(409).json({
        ok: false,
        message: "Another buyer is already checking out this listing.",
      });
    }

    const reserve = await reserveListingForEscrowBuyer(listing._id, buyerUserId);
    if (!reserve.ok) {
      return void res.status(409).json({ ok: false, message: reserve.message });
    }

    const payload = buildEscrowListingPurchasePayload(
      listing,
      buyerEmail,
      sellerEmail,
      priceDollars,
    );

    let escrowTransactionId: string | null = null;
    let transactionSaved = false;
    try {
      const escrowTx = await createEscrowTransactionApi(payload);
      escrowTransactionId = String(escrowTx.id);

      const amountCents = Math.round(priceDollars * 100);
      const serviceFeeCents = platformApplicationFeeCents(priceDollars);

      const transaction = new Transaction({
        ListingId: listing._id,
        customerId: buyerUserId,
        sellerId: sellerIdStr,
        paymentType: "escrow",
        escrowTransactionId,
        stripePaymentIntentId: `escrow:${escrowTransactionId}`,
        stripeCustomerId: buyer?.stripeCustomerId?.trim() || "",
        amountCharged: amountCents,
        amountPaid: amountCents,
        serviceFee: serviceFeeCents,
        billingReason: "Listing purchase (Escrow)",
        paymentStatus: "pending",
        currency: (listing.currency || "usd").toLowerCase(),
      });
      await transaction.save();
      transactionSaved = true;

      return void res.status(200).json(
        buildEscrowInitResponse({
          escrowTransactionId,
          transactionId: String(transaction._id),
          reused: false,
        }),
      );
    } catch (err) {
      if (!transactionSaved) {
        await releaseListingEscrowReserve(listing._id, buyerUserId);
      }
      throw err;
    }
  } catch (err) {
    console.error("initEscrowTransaction:", err);
    if (err instanceof EscrowApiError) {
      return void res.status(err.status >= 400 && err.status < 600 ? err.status : 502).json({
        ok: false,
        message: err.message,
        details: err.body,
      });
    }
    const msg =
      err instanceof Error ? err.message : "Failed to create Escrow transaction";
    return void res.status(500).json({ ok: false, message: msg });
  }
}
