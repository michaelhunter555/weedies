import type { Request, Response } from "express";

import { createPlatformListingFromBody } from "../../../lib/platform-listing-create";

/** Admin: create a platform-managed listing (no listing fee; sales settle on the platform Stripe account). */
export async function createPlatformListing(req: Request, res: Response) {
  try {
    const body = (req.body || {}) as Record<string, unknown>;
    const result = await createPlatformListingFromBody(body);

    if (!result.ok) {
      return void res.status(result.status).json({ message: result.message });
    }

    return void res.status(201).json({
      ok: true,
      listing: result.listing,
    });
  } catch (err) {
    console.error("createPlatformListing:", err);
    return void res.status(500).json({ message: "Failed to create platform listing" });
  }
}
