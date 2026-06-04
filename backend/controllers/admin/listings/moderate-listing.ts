import type { Request, Response } from "express";
import mongoose from "mongoose";
import Listing from "../../../models/listing";
import User from "../../../models/user";
import stripe from "../../../utils/stripe";
import { adminListingApprovalOrDenialNotificationEmail } from "../../../lib/email-notifications";

const PENDING_LIKE = new Set([
  "draft",
  "pending_listing_fee",
  "pending_review",
  "paused",
  "rejected",
]);

type ReviewAction = "approve" | "reject" | "unpublish";

const CANCELLABLE_PI_STATUSES = new Set([
  "requires_capture",
  "requires_confirmation",
  "requires_payment_method",
  "requires_action",
  "processing",
]);

export async function moderateListing(req: Request, res: Response) {
  try {
    const raw = req.params.listingId;
    const listingId = Array.isArray(raw) ? raw[0] : raw;
    if (!listingId || !mongoose.Types.ObjectId.isValid(listingId)) {
      return void res.status(400).json({ message: "Invalid listing id" });
    }

    const action = req.body?.action as ReviewAction | undefined;
    if (action !== "approve" && action !== "reject" && action !== "unpublish") {
      return void res.status(400).json({
        message: "action must be approve, reject, or unpublish",
      });
    }

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return void res.status(404).json({ message: "Listing not found" });
    }

    const seller = await User.findById(listing.sellerId).select("email name").lean() as { email: string, name: string } | null;
    if (!seller) {
      return void res.status(404).json({ message: "Seller not found" });
    }

    const status = listing.status;
    const piId = listing.paymentIntentId?.trim();

    let paymentIntent: Awaited<
      ReturnType<typeof stripe.paymentIntents.retrieve>
    > | null = null;
    if (piId) {
      paymentIntent = await stripe.paymentIntents.retrieve(piId);
    }

    if (action === "approve") {
      if (!PENDING_LIKE.has(status)) {
        return void res.status(400).json({
          message: "Only draft / pending / paused / rejected listings can be approved",
        });
      }

      if (status === "pending_listing_fee") {
        return void res.status(409).json({
          message:
            "Seller has not completed the listing fee payment yet. It cannot go live until status is pending review.",
        });
      }

      if (paymentIntent?.status === "requires_capture") {
        await stripe.paymentIntents.capture(paymentIntent.id);
      }

      listing.status = "live";
      listing.rejectionReason = undefined;
    } else if (action === "reject") {
      if (!PENDING_LIKE.has(status)) {
        return void res.status(400).json({
          message: "Only non-live listings can be rejected from this queue",
        });
      }

      if (
        paymentIntent &&
        CANCELLABLE_PI_STATUSES.has(paymentIntent.status)
      ) {
        await stripe.paymentIntents.cancel(paymentIntent.id);
      }

      listing.status = "rejected";
      const reason = String(req.body?.rejectionReason ?? "").trim();
      listing.rejectionReason = reason || "Rejected by admin";
    } else {
      if (status !== "live") {
        return void res.status(400).json({
          message: "Only live listings can be taken down",
        });
      }
      listing.status = "paused";
      listing.rejectionReason = undefined;
    }

    await listing.save();

    await adminListingApprovalOrDenialNotificationEmail(
      seller.email as string,
      seller.name as string,
      listingId,
      listing.appName,
      listing.status,
      new Date(),
      action === "reject" ? listing.rejectionReason : undefined,
    );

    res.json({ ok: true, listing: listing.toObject() });
  } catch (err) {
    console.error("moderateListing", err);
    res.status(500).json({ message: "Failed to update listing" });
  }
}
