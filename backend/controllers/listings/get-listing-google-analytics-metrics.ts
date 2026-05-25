import type { Request, Response } from "express";
import mongoose from "mongoose";

import { fetchGa4ListingMetrics } from "../../lib/ga4-data-api";
import {
  GA_NEEDS_RECONNECT,
  GoogleAnalyticsReconnectError,
  getValidGoogleAnalyticsAccessToken,
} from "../../lib/google-analytics-access-token";
import Listing from "../../models/listing";

function sellerIdString(sellerId: unknown): string {
  if (sellerId && typeof sellerId === "object" && "_id" in (sellerId as object)) {
    return String((sellerId as { _id: unknown })._id);
  }
  return String(sellerId ?? "");
}

/**
 * Public (live listing) or owner (any status): last-30-day GA4 snapshot for the
 * linked property. Uses the seller's stored Google OAuth tokens.
 */
export async function getListingGoogleAnalyticsMetrics(req: Request, res: Response) {
  try {
    const raw = req.params.id;
    const idParam = Array.isArray(raw) ? String(raw[0] ?? "") : String(raw ?? "");
    if (!idParam) {
      return void res.status(400).json({ message: "Invalid listing id" });
    }

    const tryById = mongoose.isValidObjectId(idParam);
    const listingRaw = tryById
      ? await Listing.findById(idParam)
          .select("sellerId status googleAnalyticsPropertyResourceName")
          .lean()
      : await Listing.findOne({ slug: idParam })
          .select("sellerId status googleAnalyticsPropertyResourceName")
          .lean();

    const listing = listingRaw as {
      sellerId: unknown;
      status?: string;
      googleAnalyticsPropertyResourceName?: string | null;
    } | null;

    if (!listing) {
      return void res.status(404).json({ message: "Listing not found" });
    }

    const prop = listing.googleAnalyticsPropertyResourceName?.trim();
    if (!prop || !prop.startsWith("properties/")) {
      return void res.status(404).json({
        message: "No Google Analytics property linked to this listing.",
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
      accessToken = await getValidGoogleAnalyticsAccessToken(sellerStr);
    } catch (e) {
      if (e instanceof GoogleAnalyticsReconnectError) {
        return void res.status(412).json({
          code: GA_NEEDS_RECONNECT,
          message: e.message,
          /** Owners should reconnect; viewers just see "not connected". */
          needsReconnect: isOwner,
        });
      }
      console.error("getListingGoogleAnalyticsMetrics token:", e);
      return void res.status(503).json({
        message:
          "Google Analytics is not connected for this seller or the connection expired. Reconnect in listing verification.",
      });
    }

    try {
      const payload = await fetchGa4ListingMetrics(accessToken, prop);
      return void res.status(200).json(payload);
    } catch (e) {
      console.error("getListingGoogleAnalyticsMetrics GA4:", e);
      const msg = e instanceof Error ? e.message : "GA4 request failed";
      return void res.status(502).json({
        message: "Could not load metrics from Google Analytics.",
        details: msg.slice(0, 500),
      });
    }
  } catch (err) {
    console.error("getListingGoogleAnalyticsMetrics:", err);
    return void res.status(500).json({ message: "Failed to load analytics" });
  }
}
