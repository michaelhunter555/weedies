import type { Request, Response } from "express";
import mongoose from "mongoose";

import Listing from "../../models/listing";

type Body = {
  listingId?: string;
  propertyResourceName?: string;
  propertyDisplayName?: string;
};

/** Seller attaches a GA4 property they already OAuth’d to one of their listings. */
export async function linkGoogleAnalyticsToListing(req: Request, res: Response) {
  try {
    const sellerId = req.user?.userId;
    if (!sellerId) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    const {
      listingId,
      propertyResourceName,
      propertyDisplayName,
    } = (req.body || {}) as Body;

    if (
      !listingId ||
      !mongoose.isValidObjectId(listingId) ||
      typeof propertyResourceName !== "string" ||
      !propertyResourceName.startsWith("properties/")
    ) {
      return void res.status(400).json({
        message:
          "listingId and a valid propertyResourceName (e.g. properties/123…) are required.",
      });
    }

    const listing = await Listing.findOneAndUpdate(
      { _id: listingId, sellerId },
      {
        $set: {
          googleAnalyticsPropertyResourceName: propertyResourceName.trim(),
          googleAnalyticsPropertyDisplayName:
            typeof propertyDisplayName === "string"
              ? propertyDisplayName.trim()
              : propertyResourceName,
        },
      },
      { new: true },
    );

    if (!listing) {
      return void res.status(404).json({ message: "Listing not found" });
    }

    return void res.status(200).json(listing);
  } catch (err) {
    console.error("linkGoogleAnalyticsToListing:", err);
    return void res.status(500).json({ message: "Failed to link property" });
  }
}
