import type { Request, Response } from "express";
import Listing from "../../models/listing";

/** Seller-only: soft-remove their own listing (status → "removed"). */
export async function deleteListing(req: Request, res: Response) {
  try {
    const sellerId = req.user?.userId;
    const { id } = req.params;
    if (!sellerId) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

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
