import type { Request, Response } from "express";
import mongoose from "mongoose";

import Listing from "../../models/listing";

type Body = {
  listingId?: string;
  projectId?: string;
  projectDisplayName?: string;
};

/** Stub: persists chosen RevenueCat project metadata on the listing when provided. */
export async function linkRevenueCatToListing(req: Request, res: Response) {
  try {
    const sellerId = req.user?.userId;
    if (!sellerId) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    const { listingId, projectId, projectDisplayName } = (req.body ||
      {}) as Body;

    if (!listingId || !mongoose.isValidObjectId(listingId)) {
      return void res.status(400).json({ message: "Valid listingId required." });
    }

    if (!projectId || typeof projectId !== "string") {
      return void res.status(400).json({ message: "projectId required." });
    }

    const listing = await Listing.findOneAndUpdate(
      { _id: listingId, sellerId },
      {
        $set: {
          revenueCatProjectId: projectId.trim(),
          revenueCatProjectDisplayName:
            typeof projectDisplayName === "string"
              ? projectDisplayName.trim()
              : projectId.trim(),
        },
      },
      { new: true },
    );

    if (!listing) {
      return void res.status(404).json({ message: "Listing not found" });
    }

    return void res.status(200).json(listing);
  } catch (err) {
    console.error("linkRevenueCatToListing:", err);
    return void res.status(500).json({ message: "Failed to link RevenueCat" });
  }
}
