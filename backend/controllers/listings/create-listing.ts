import type { Request, Response } from "express";
import Listing from "../../models/listing";
import stripe from "../../utils/stripe";
import User from "../../models/user";

/**
 * Creates a new listing in `draft` state owned by the authenticated seller.
 * Moderation + publishing happens via `publish-listing`.
 *
 * TODO: multer/cloudinary image upload, slug generation, terms-agreement
 * validation, first-listing-free check against User.totalListings.
 */
export async function createListing(req: Request, res: Response) {
  try {
    const sellerId = req.user?.userId;
    const user = await User.findById(sellerId);
    if (!user) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    if(user.totalListings > 0 && !user.stripeCustomerId) {
      return void res.status(400).json({ message: "Please connect your Stripe account to submit a listing." });
    }

    const listingFee = 2.99;
    
    const listing = new Listing({
      ...req.body,
      sellerId,
      status: "draft" as const,
    })

    // save first in case payment fails - so data is not life
    await listing.save();

    await stripe.paymentIntents.create({
      amount: listingFee * 100,
      currency: "usd",
      customer: user.stripeCustomerId,
      description: "Listing fee",
      payment_method_types: ["card"],
      metadata: {
        listingId: String(listing._id),
        sellerId: user._id.toString(),
        paymentType: "listing-fee",
      },
    }, { idempotencyKey: `${String(listing._id)}::stripe:payment-intent:create` });

    return void res.status(201).json({ ok: true });
  } catch (err) {
    console.log("createListing error:", err);
    return void res.status(500).json({ message: "Failed to create listing" });
  }
}
