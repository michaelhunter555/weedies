import type { Request, Response } from "express";
import mongoose from "mongoose";

import { serializeDispute } from "../../../lib/serialize-dispute";
import type { IDisputes } from "../../../models/disputes";
import Dispute from "../../../models/disputes";
import Listing from "../../../models/listing";
import User from "../../../models/user";

/**
 * GET /api/admin/disputes/:disputeId
 */
export async function getAdminDisputeById(req: Request, res: Response) {
  try {
    const raw = req.params.disputeId;
    const disputeId = Array.isArray(raw) ? raw[0] : raw;
    if (!disputeId || !mongoose.isValidObjectId(disputeId)) {
      return void res.status(400).json({ message: "Invalid dispute id" });
    }

    const dispute = (await Dispute.findById(disputeId).lean()) as IDisputes | null;
    if (!dispute) {
      return void res.status(404).json({ message: "Dispute not found" });
    }

    const [listing, buyer, seller] = await Promise.all([
      Listing.findById(dispute.listingId)
        .select("appName slug status photos coverIndex saleType sellerId buyerId")
        .lean() as Promise<{
        _id: unknown;
        appName?: string;
        slug?: string;
        status?: string;
        photos?: string[];
        coverIndex?: number;
        saleType?: string;
      } | null>,
      User.findById(dispute.userId).select("name email").lean() as Promise<{
        _id: unknown;
        name?: string;
        email?: string;
      } | null>,
      User.findById(dispute.sellerId).select("name email").lean() as Promise<{
        _id: unknown;
        name?: string;
        email?: string;
      } | null>,
    ]);

    return void res.json({
      ok: true,
      dispute: serializeDispute(dispute),
      listing: listing
        ? {
            id: String(listing._id),
            appName: listing.appName ?? "Listing",
            slug: listing.slug ?? "",
            status: listing.status,
            photos: listing.photos ?? [],
            coverIndex: listing.coverIndex ?? 0,
            saleType: listing.saleType,
          }
        : null,
      buyer: buyer
        ? { id: String(buyer._id), name: buyer.name ?? "", email: buyer.email ?? "" }
        : null,
      seller: seller
        ? { id: String(seller._id), name: seller.name ?? "", email: seller.email ?? "" }
        : null,
    });
  } catch (err) {
    console.error("getAdminDisputeById:", err);
    return void res.status(500).json({ message: "Failed to load dispute" });
  }
}
