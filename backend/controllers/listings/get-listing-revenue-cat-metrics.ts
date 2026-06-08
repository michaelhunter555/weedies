import type { Request, Response } from "express";
import mongoose from "mongoose";

import { fetchRevenueCatListingMetrics } from "../../lib/revenue-cat-metrics-api";
import {
  RC_NEEDS_RECONNECT,
  RevenueCatReconnectError,
  getValidRevenueCatAccessToken,
} from "../../lib/revenue-cat-access-token";
import Listing from "../../models/listing";

function sellerIdString(sellerId: unknown): string {
  if (sellerId && typeof sellerId === "object" && "_id" in (sellerId as object)) {
    return String((sellerId as { _id: unknown })._id);
  }
  return String(sellerId ?? "");
}

/**
 * Public (live listing) or owner (any status): RevenueCat overview snapshot for the
 * linked project. Uses the seller's stored RevenueCat OAuth tokens.
 */
export async function getListingRevenueCatMetrics(req: Request, res: Response) {
  try {
    const raw = req.params.id;
    const idParam = Array.isArray(raw) ? String(raw[0] ?? "") : String(raw ?? "");
    if (!idParam) {
      return void res.status(400).json({ message: "Invalid listing id" });
    }

    const tryById = mongoose.isValidObjectId(idParam);
    const listingRaw = tryById
      ? await Listing.findById(idParam)
          .select("sellerId status revenueCatProjectId revenueCatProjectDisplayName")
          .lean()
      : await Listing.findOne({ slug: idParam })
          .select("sellerId status revenueCatProjectId revenueCatProjectDisplayName")
          .lean();

    const listing = listingRaw as {
      sellerId: unknown;
      status?: string;
      revenueCatProjectId?: string | null;
      revenueCatProjectDisplayName?: string | null;
    } | null;

    if (!listing) {
      return void res.status(404).json({ message: "Listing not found" });
    }

    const projectId = listing.revenueCatProjectId?.trim();
    if (!projectId) {
      return void res.status(404).json({
        message: "No RevenueCat project linked to this listing.",
      });
    }

    const ownerId = req.user?.userId;
    const sellerStr = sellerIdString(listing.sellerId);
    const isOwner = Boolean(ownerId && ownerId === sellerStr);

    if (listing.status !== "live" && !isOwner) {
      return void res.status(404).json({ message: "Listing not found" });
    }

    let accessToken: string;
    try {
      accessToken = await getValidRevenueCatAccessToken(sellerStr);
    } catch (e) {
      if (e instanceof RevenueCatReconnectError) {
        return void res.status(412).json({
          code: RC_NEEDS_RECONNECT,
          message: e.message,
          /** Owners should reconnect; viewers just see "not connected". */
          needsReconnect: isOwner,
        });
      }
      console.error("getListingRevenueCatMetrics token:", e);
      return void res.status(503).json({
        message:
          "RevenueCat is not connected for this seller or the connection expired. Reconnect in listing verification.",
      });
    }

    try {
      const payload = await fetchRevenueCatListingMetrics({
        accessToken,
        projectId,
      });
      if (
        !payload.projectName &&
        listing.revenueCatProjectDisplayName?.trim()
      ) {
        payload.projectName = listing.revenueCatProjectDisplayName.trim();
      }
      return void res.status(200).json(payload);
    } catch (e) {
      console.error("getListingRevenueCatMetrics RC:", e);
      const msg = e instanceof Error ? e.message : "RevenueCat request failed";
      return void res.status(502).json({
        message: "Could not load metrics from RevenueCat.",
        details: msg.slice(0, 500),
      });
    }
  } catch (err) {
    console.error("getListingRevenueCatMetrics:", err);
    return void res.status(500).json({ message: "Failed to load RevenueCat metrics" });
  }
}
