import type { Request, Response } from "express";
import Listing from "../../models/listing";

/**
 * Seller submits a draft for review. We always flip it to `pending_review`.
 *
 * TODO: run through an automated content check before publishing.
 */
export async function publishListing(req: Request, res: Response) {
  try {
    const sellerId = req.user?.userId;
    const { id } = req.params;
    if (!sellerId) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    const listing = await Listing.findOneAndUpdate(
      { _id: id, sellerId, status: { $in: ["draft", "paused", "rejected"] } },
      { $set: { status: "pending_review", rejectionReason: undefined } },
      { new: true },
    );

    if (!listing) {
      return void res.status(404).json({ message: "Listing not found or not publishable" });
    }

    return void res.status(200).json(listing);
  } catch (err) {
    console.log("publishListing error:", err);
    return void res.status(500).json({ message: "Failed to publish listing" });
  }
}
