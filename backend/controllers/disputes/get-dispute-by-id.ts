import type { Request, Response } from "express";
import mongoose from "mongoose";

import { serializeDispute } from "../../lib/serialize-dispute";
import Dispute, { type IDisputes } from "../../models/disputes";
import Listing from "../../models/listing";

/**
 * GET /api/disputes/:disputeId
 */
export async function getDisputeById(req: Request, res: Response) {
  const uid = req.user?.userId;
  if (!uid) {
    return void res.status(401).json({ message: "Unauthorized", ok: false });
  }

  const disputeId = String(req.params.disputeId ?? "").trim();
  if (!mongoose.isValidObjectId(disputeId)) {
    return void res.status(400).json({ message: "Invalid dispute id.", ok: false });
  }

  try {
    const dispute = (await Dispute.findById(disputeId).lean()) as IDisputes | null;
    if (!dispute) {
      return void res.status(404).json({ message: "Dispute not found.", ok: false });
    }

    const isParty =
      String(dispute.userId) === uid || String(dispute.sellerId) === uid;
    if (!isParty) {
      return void res.status(403).json({ message: "Forbidden.", ok: false });
    }

    const listing = (await Listing.findById(dispute.listingId)
      .select("appName slug photos coverIndex")
      .lean()) as {
      appName?: string;
      slug?: string;
      photos?: string[];
      coverIndex?: number;
    } | null;

    const role = String(dispute.sellerId) === uid ? "seller" : "buyer";

    return void res.status(200).json({
      ok: true,
      role,
      dispute: serializeDispute(dispute),
      listing: listing
        ? {
            id: String(dispute.listingId),
            appName: listing.appName ?? "Listing",
            slug: listing.slug ?? "",
            photos: listing.photos ?? [],
            coverIndex: listing.coverIndex ?? 0,
          }
        : null,
    });
  } catch (err) {
    console.error("getDisputeById:", err);
    return void res.status(500).json({
      message: "Failed to load dispute.",
      ok: false,
    });
  }
}
