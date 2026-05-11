import type { Request, Response } from "express";
import Listing from "../../models/listing";

/**
 * Returns all listings owned by the authenticated seller (any status).
 * Used to power the dashboard "Active listings" + drafts section.
 */
export async function getListingsBySeller(req: Request, res: Response) {
  try {
    const sellerId = req.user?.userId;
    if (!sellerId) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    const listings = await Listing.find({ sellerId }).sort({ updatedAt: -1 });
    return void res.status(200).json(listings);
  } catch (err) {
    console.log("getListingsBySeller error:", err);
    return void res.status(500).json({ message: "Failed to fetch seller listings" });
  }
}
