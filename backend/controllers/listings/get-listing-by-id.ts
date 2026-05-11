import type { Request, Response } from "express";
import mongoose from "mongoose";
import Listing from "../../models/listing";

/** Fetch a single listing by `_id` or `slug`. Bumps the view counter. */
export async function getListingById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const isObjectId = mongoose.isValidObjectId(id);

    const listing = await Listing.findOneAndUpdate(
      isObjectId ? { _id: id } : { slug: id },
      { $inc: { views: 1 } },
      { new: true },
    ).populate("sellerId", "name email isVerifiedCreator hasVerifiedAnalytics");

    if (!listing) {
      return void res.status(404).json({ message: "Listing not found" });
    }

    return void res.status(200).json(listing);
  } catch (err) {
    console.log("getListingById error:", err);
    return void res.status(500).json({ message: "Failed to fetch listing" });
  }
}
