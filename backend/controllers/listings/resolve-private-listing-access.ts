import type { Request, Response } from "express";
import mongoose from "mongoose";

import { io } from "../../app";
import { SocketEvents } from "../../lib/socket-events";
import {
  persistedPrivateRequestRows,
  requesterIdStringFromRow,
} from "../../lib/private-listing-request-subdoc";
import Listing from "../../models/listing";

export async function resolvePrivateListingAccess(req: Request, res: Response) {
  try {
    const sellerId = req.user?.userId;
    if (!sellerId) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    const rawListingId = req.params.id;
    const listingId =
      Array.isArray(rawListingId) ? String(rawListingId[0] ?? "") : String(rawListingId ?? "");
    const rawRequestId = req.params.requestId;
    const requestId =
      Array.isArray(rawRequestId) ? String(rawRequestId[0] ?? "") : String(rawRequestId ?? "");
    if (!listingId || !mongoose.isValidObjectId(listingId)) {
      return void res.status(400).json({ message: "Invalid listing id" });
    }
    if (!requestId || !mongoose.isValidObjectId(requestId)) {
      return void res.status(400).json({ message: "Invalid request id" });
    }

    const rawDecision = (req.body as { decision?: unknown })?.decision;
    const decision = rawDecision === "approve" ? "approved" : rawDecision === "deny" ? "denied" : "";
    if (!decision) {
      return void res.status(400).json({ message: "Decision must be approve or deny." });
    }

    const listing = await Listing.findOne({ _id: listingId, sellerId });
    if (!listing) {
      return void res.status(404).json({ message: "Listing not found" });
    }
    if (!listing.isPrivateListing) {
      return void res.status(400).json({ message: "Listing is not private." });
    }

    const rows = listing.pendingPrivateListingRequests ?? [];
    const row = rows.find((r: { _id?: unknown }) => String(r._id) === requestId);
    if (!row) {
      return void res.status(404).json({ message: "Request not found." });
    }

    let requesterId: string;
    try {
      requesterId = requesterIdStringFromRow(row);
    } catch {
      return void res.status(400).json({ message: "Access request is missing requester data." });
    }

    row.status = decision;
    row.resolvedAt = new Date();

    listing.pendingPrivateListingRequests = persistedPrivateRequestRows(
      listing.pendingPrivateListingRequests,
    );

    const approved = Array.isArray(listing.approvedUsersList)
      ? listing.approvedUsersList.map((id: unknown) => String(id))
      : [];
    if (decision === "approved") {
      if (!approved.includes(requesterId)) approved.push(requesterId);
      listing.approvedUsersList = approved;
    } else {
      listing.approvedUsersList = approved.filter((id: string) => id !== requesterId);
    }

    await listing.save();

    io.to(requesterId).emit(SocketEvents.PRIVATE_LISTING_REQUEST_RESOLVED, {
      listingId: String(listing._id),
      appName: String(listing.appName ?? "Private listing"),
      status: decision,
      message:
        decision === "approved"
          ? `Access approved for ${String(listing.appName ?? "this listing")}.`
          : `Access request denied for ${String(listing.appName ?? "this listing")}.`,
    });
    io.to(sellerId).emit(SocketEvents.PRIVATE_LISTING_REQUEST_RESOLVED, {
      listingId: String(listing._id),
      requestId,
      status: decision,
      requesterId,
      message:
        decision === "approved"
          ? "Access request approved."
          : "Access request denied.",
    });

    return void res.status(200).json({
      success: true,
      requestId,
      status: decision,
      requesterId,
      approvedUsersList: listing.approvedUsersList ?? [],
      pendingPrivateListingRequests: listing.pendingPrivateListingRequests ?? [],
    });
  } catch (err) {
    console.log("resolvePrivateListingAccess error:", err);
    return void res.status(500).json({ message: "Failed to resolve access request" });
  }
}
