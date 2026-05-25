import type { Request, Response } from "express";
import mongoose from "mongoose";

import { io } from "../../app";
import { SocketEvents } from "../../lib/socket-events";
import { persistedPrivateRequestRows } from "../../lib/private-listing-request-subdoc";
import Listing from "../../models/listing";

export async function requestPrivateListingAccess(req: Request, res: Response) {
  try {
    const requesterId = req.user?.userId;
    if (!requesterId) {
      return void res.status(401).json({ message: "Sign in to request access." });
    }

    const rawId = req.params.id;
    const listingId = Array.isArray(rawId) ? String(rawId[0] ?? "") : String(rawId ?? "");
    if (!listingId || !mongoose.isValidObjectId(listingId)) {
      return void res.status(400).json({ message: "Invalid listing id" });
    }

    const listing = await Listing.findById(listingId);
    if (!listing || listing.status !== "live") {
      return void res.status(404).json({ message: "Listing not found" });
    }
    if (!listing.isPrivateListing) {
      return void res.status(400).json({ message: "This listing is not private." });
    }

    const sellerId = String(listing.sellerId);
    if (sellerId === requesterId) {
      return void res.status(400).json({ message: "You already own this listing." });
    }

    const approved = Array.isArray(listing.approvedUsersList)
      ? listing.approvedUsersList.map((id: unknown) => String(id))
      : [];
    if (approved.includes(requesterId)) {
      return void res.status(200).json({ status: "approved", message: "Already approved." });
    }

    const rawMessage = (req.body as { message?: unknown })?.message;
    const accessMessage =
      typeof rawMessage === "string" ? rawMessage.trim().slice(0, 500) : "";

    if (!listing.pendingPrivateListingRequests) {
      listing.pendingPrivateListingRequests = [];
    }
    const requests = listing.pendingPrivateListingRequests;
    const existingIdx = requests.findIndex(
      (r: { requesterId?: unknown }) => String(r.requesterId) === requesterId,
    );

    let requestId = "";
    if (existingIdx >= 0) {
      const cur = requests[existingIdx];
      if (cur.status === "pending") {
        return void res.status(200).json({
          status: "pending",
          requestId: String(cur._id ?? ""),
          message: "Access request already pending.",
        });
      }
      cur.status = "pending";
      cur.createdAt = new Date();
      cur.resolvedAt = undefined;
      if (accessMessage) cur.message = accessMessage;
      requestId = String(cur._id ?? "");
    } else {
      requests.push({
        requesterId: new mongoose.Types.ObjectId(requesterId),
        status: "pending",
        createdAt: new Date(),
        ...(accessMessage ? { message: accessMessage } : {}),
      });
      requestId = String(requests[requests.length - 1]?._id ?? "");
    }

    listing.pendingPrivateListingRequests = persistedPrivateRequestRows(requests);
    await listing.save();

    io.to(sellerId).emit(SocketEvents.PRIVATE_LISTING_REQUEST_CREATED, {
      listingId: String(listing._id),
      appName: String(listing.appName ?? "Private listing"),
      requesterId,
      requestId,
      message: `New private access request for ${String(listing.appName ?? "your listing")}.`,
    });

    return void res.status(201).json({
      status: "pending",
      requestId,
      message: "Access request sent to seller.",
    });
  } catch (err) {
    console.log("requestPrivateListingAccess error:", err);
    return void res.status(500).json({ message: "Failed to request access" });
  }
}

