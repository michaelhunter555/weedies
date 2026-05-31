import type { Request, Response } from "express";

import { disconnectGoogleAnalyticsForUser } from "../../lib/google-analytics-disconnect";

export async function disconnectGoogleAnalytics(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    const body = (req.body ?? {}) as {
      listingId?: string;
      clearListingProperty?: boolean;
    };

    const listingId =
      typeof body.listingId === "string" ? body.listingId.trim() : undefined;
    const clearListingProperty = Boolean(body.clearListingProperty);

    await disconnectGoogleAnalyticsForUser({
      userId,
      listingId,
      clearListingProperty,
    });

    return void res.status(200).json({ ok: true });
  } catch (err) {
    console.error("disconnectGoogleAnalytics:", err);
    return void res
      .status(500)
      .json({ message: "Failed to disconnect Google Analytics" });
  }
}
