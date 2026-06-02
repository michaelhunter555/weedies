import type { Request, Response } from "express";
import Listing from "../../models/listing";
import ListingExchange from "../../models/exchange";
import Transaction from "../../models/transactions";
import stripe from "../../utils/stripe";

/** Seller-only: soft-remove their own listing (status → "removed"). */
export async function deleteListing(req: Request, res: Response) {
  try {
    const sellerId = req.user?.userId;
    const { id } = req.params;
    if (!sellerId) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    // make sure they are deleted a listing in active exchange
    const isInExchange = await ListingExchange.exists({
      listingId: id,
      sellerId: sellerId,
      sellerCapturedPayment: true,
      buyerConfirmedAt: null,
    })

    const transaction = await Transaction.findOne({
      ListingId: id,
      sellerId: sellerId,
      paymentStatus: { $in: ["pending", "succeeded"] },
    })

    // check if listing has transactions that are incomplete
    // mainly any where payment was accepted but not the exchange is incomplete.
    if(transaction) {
      if(transaction.paymentType === "escrow") {
        if(transaction.escrowFundsSecured && isInExchange) {
          return void res.status(400).json({ message: "Listing is in active exchange. Please complete handover before deleting." });
        }
      }
  
      if(transaction.paymentType === "stripe") {
        if(transaction.paymentStatus === "succeeded" && isInExchange) {
          return void res.status(400).json({ message: "Listing is in active exchange. Please complete handover before deleting." });
        }

        // cancel pending transactions
        if(
          transaction.paymentStatus === "pending" && 
          transaction.stripePaymentIntendId
        ) {
          const intent = await stripe.paymentIntents.retrieve(transaction.stripePaymentIntendId);

          if(intent.status === "requires_capture") {
            await stripe.paymentIntents.cancel(transaction.stripePaymentIntendId);
          }
        } 
      }

    }

    // add to queue for cron job deletion
    const listing = await Listing.findOneAndUpdate(
      { _id: id, sellerId },
      { $set: { status: "removed" } },
      { new: true },
    );

    if (!listing) {
      return void res.status(404).json({ message: "Listing not found" });
    }

    return void res.status(200).json({ success: true, id: listing._id });
  } catch (err) {
    console.log("deleteListing error:", err);
    return void res.status(500).json({ message: "Failed to delete listing" });
  }
}
