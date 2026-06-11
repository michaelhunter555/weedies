import type { Request, Response } from "express";
import mongoose from "mongoose";

import { updatePlatformListingFromBody } from "../../../lib/platform-listing-create";

/** Admin: update a platform-managed listing. */
export async function updatePlatformListing(req: Request, res: Response) {
  try {
    const rawId = req.params.listingId;
    const listingId = Array.isArray(rawId) ? String(rawId[0] ?? "") : String(rawId ?? "");
    if (!listingId || !mongoose.isValidObjectId(listingId)) {
      return void res.status(400).json({ message: "Invalid listing id" });
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const result = await updatePlatformListingFromBody(listingId, body);

    if (!result.ok) {
      return void res.status(result.status).json({ message: result.message });
    }

    return void res.status(200).json({
      ok: true,
      listing: result.listing,
    });
  } catch (err) {
    console.error("updatePlatformListing error:", err);
    return void res.status(500).json({ message: "Failed to update platform listing" });
  }
}
