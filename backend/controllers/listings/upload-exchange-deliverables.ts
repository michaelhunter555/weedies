import type { Request, Response } from "express";
import mongoose from "mongoose";

import { uploadBufferToCloudinary } from "../../lib/cloudinary";
import ListingExchange from "../../models/exchange";
import Listing from "../../models/listing";

const MAX_FILES_PER_REQUEST = 12;
const MAX_DELIVERABLES_TOTAL = 30;

function listingOwnerIdString(listing: { sellerId?: unknown }): string {
  const sid = listing.sellerId;
  if (!sid) return "";
  if (sid instanceof mongoose.Types.ObjectId) return String(sid);
  if (typeof sid === "object" && sid !== null && "_id" in sid) {
    return String((sid as { _id: unknown })._id);
  }
  return String(sid);
}

export async function uploadExchangeDeliverables(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    const listingId = Array.isArray(req.params.listingId)
      ? String(req.params.listingId[0] ?? "")
      : String(req.params.listingId ?? "");
    if (!mongoose.isValidObjectId(listingId)) {
      return void res.status(400).json({ message: "Invalid listing id" });
    }

    const files = (req as Request & { files?: Express.Multer.File[] }).files;
    if (!files?.length) {
      return void res.status(400).json({ message: "No files provided" });
    }

    const listing = await Listing.findById(listingId).select("status sellerId buyerId");
    if (!listing || listing.status !== "sold") {
      return void res.status(404).json({ message: "Listing not found or not sold." });
    }

    const sellerId = listingOwnerIdString(listing);
    if (userId !== sellerId) {
      return void res.status(403).json({ message: "Only the seller can upload deliverables." });
    }

    const ex = await ListingExchange.findOne({ listingId: listing._id });
    if (!ex) {
      return void res.status(409).json({
        message: "Open the exchange page once to initialize the handover record.",
      });
    }

    if (ex.buyerConfirmedAt) {
      return void res.status(409).json({ message: "This exchange is already completed." });
    }

    const slice = files.slice(0, MAX_FILES_PER_REQUEST);
    const current = ex.deliverables?.length ?? 0;
    if (current + slice.length > MAX_DELIVERABLES_TOTAL) {
      return void res.status(400).json({
        message: `You can attach at most ${MAX_DELIVERABLES_TOTAL} files for this sale.`,
      });
    }

    const newEntries: { url: string; originalName: string; uploadedAt: Date }[] = [];
    for (const f of slice) {
      const up = await uploadBufferToCloudinary(
        f.buffer,
        f.mimetype || "application/octet-stream",
      );
      const url = (up as { secure_url?: string }).secure_url;
      if (!url) continue;
      newEntries.push({
        url,
        originalName: f.originalname || "file",
        uploadedAt: new Date(),
      });
    }

    if (newEntries.length === 0) {
      return void res.status(500).json({ message: "Upload failed" });
    }

    ex.deliverables.push(...newEntries);
    await ex.save();

    return void res.status(201).json({
      deliverables: ex.deliverables.map(
        (d: { url: string; originalName?: string; uploadedAt?: Date }) => ({
          url: d.url,
          originalName: d.originalName,
          uploadedAt:
            d.uploadedAt instanceof Date
              ? d.uploadedAt.toISOString()
              : new Date().toISOString(),
        }),
      ),
    });
  } catch (err) {
    console.log("uploadExchangeDeliverables error:", err);
    return void res.status(500).json({ message: "Failed to upload deliverables" });
  }
}
