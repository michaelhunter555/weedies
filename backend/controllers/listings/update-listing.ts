import type { Request, Response } from "express";
import Listing from "../../models/listing";

/** Seller-only: patch mutable fields on their own listing. */
export async function updateListing(req: Request, res: Response) {
  try {
    const sellerId = req.user?.userId;
    const { id } = req.params;
    if (!sellerId) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    // never let the client overwrite ownership / lifecycle / verification
    const {
      sellerId: _s,
      buyerId: _b,
      status: _st,
      soldAt: _so,
      publishedAt: _p,
      isListingVerified: _lv,
      isAnalyticsVerified: _av,
      verifiedProviders: _vp,
      views: _v,
      favoritesCount: _f,
      totalReviews: _tr,
      averageRating: _ar,
      ...safe
    } = req.body || {};

    const listing = await Listing.findOneAndUpdate(
      { _id: id, sellerId },
      { $set: safe },
      { new: true },
    );

    if (!listing) {
      return void res.status(404).json({ message: "Listing not found" });
    }

    return void res.status(200).json(listing);
  } catch (err) {
    console.log("updateListing error:", err);
    return void res.status(500).json({ message: "Failed to update listing" });
  }
}
