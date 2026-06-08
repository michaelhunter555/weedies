import type { Request, Response } from "express";
import { disconnectRevenueCatForUser } from "../../lib/revenue-cat-disconnect";

export async function disconnectRevenueCat(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    const body = (req.body ?? {}) as {
      listingId?: string;
      clearListingProject?: boolean;
    };

    const listingId =
      typeof body.listingId === "string" ? body.listingId.trim() : undefined;
    const clearListingProject = Boolean(body.clearListingProject);

    await disconnectRevenueCatForUser({
      userId,
      listingId,
      clearListingProject,
    });

    return void res.status(200).json({ ok: true });
  } catch (err) {
    console.error("disconnectRevenueCat:", err);
    return void res.status(500).json({ message: "Failed to disconnect RevenueCat" });
  }
}
