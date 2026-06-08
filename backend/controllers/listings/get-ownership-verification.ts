import type { Request, Response } from "express";
import Listing from "../../models/listing";
import { buildOwnershipVerificationFields } from "../../lib/ensure-listing-ownership-verification";
import {
  buildWellKnownVerificationUrl,
  OWNERSHIP_VERIFICATION_FILE_NAME,
  OWNERSHIP_VERIFICATION_WELL_KNOWN_PATH,
  ownershipVerificationGuidesForListing,
  resolveListingWebOrigin,
  resolveStoreListingUrls,
} from "../../lib/ownership-verification";

/** Seller-only: token + placement instructions for ownership verification. */
export async function getOwnershipVerification(req: Request, res: Response) {
  try {
    const sellerId = req.user?.userId;
    if (!sellerId) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    const rawId = req.params.id;
    const listingId = Array.isArray(rawId) ? String(rawId[0] ?? "") : String(rawId ?? "");
    if (!listingId) {
      return void res.status(400).json({ message: "Invalid listing id" });
    }

    const listing = await Listing.findOne({ _id: listingId, sellerId });
    if (!listing) {
      return void res.status(404).json({ message: "Listing not found" });
    }

    const needsSave =
      !listing.ownershipVerification?.verificationToken?.trim() ||
      !listing.ownershipVerification?.storeListingCode?.trim();

    const fields = buildOwnershipVerificationFields(
      String(listing._id),
      sellerId,
      listing.ownershipVerification,
    );

    if (needsSave) {
      listing.ownershipVerification = fields;
      await listing.save();
    }

    const webOrigin = resolveListingWebOrigin(listing);
    const verificationCheckUrl = webOrigin
      ? buildWellKnownVerificationUrl(webOrigin)
      : null;
    const storeListingUrls = resolveStoreListingUrls(listing);

    return void res.status(200).json({
      listingId: String(listing._id),
      appName: listing.appName,
      platforms: listing.platforms ?? [],
      webOrigin,
      verificationCheckUrl,
      verificationToken: fields.verificationToken,
      storeListingCode: fields.storeListingCode,
      storeListingUrls,
      isVerified: listing.ownershipVerification?.isVerified === true,
      verifiedVia: listing.ownershipVerification?.verifiedVia ?? null,
      dateVerified: listing.ownershipVerification?.dateVerified ?? null,
      wellKnownPath: OWNERSHIP_VERIFICATION_WELL_KNOWN_PATH,
      fileName: OWNERSHIP_VERIFICATION_FILE_NAME,
      platformGuides: ownershipVerificationGuidesForListing(listing),
    });
  } catch (err) {
    console.log("getOwnershipVerification error:", err);
    return void res.status(500).json({ message: "Failed to load ownership verification" });
  }
}
