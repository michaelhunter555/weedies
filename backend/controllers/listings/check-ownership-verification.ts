import type { Request, Response } from "express";
import Listing from "../../models/listing";
import type { OwnershipVerifiedVia } from "../../lib/ownership-verification";
import {
  checkRemoteOwnershipVerificationToken,
  checkStoreListingVerificationCode,
  resolveListingWebOrigin,
} from "../../lib/ownership-verification";

function parseCheckMethod(body: unknown): OwnershipVerifiedVia {
  const raw = (body as { method?: unknown } | null | undefined)?.method;
  return raw === "store_listing" ? "store_listing" : "well_known";
}

/** Seller-only: verify via website file or App Store / Play Store listing text. */
export async function checkOwnershipVerification(req: Request, res: Response) {
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

    const verificationToken = listing.ownershipVerification?.verificationToken?.trim();
    const storeListingCode = listing.ownershipVerification?.storeListingCode?.trim();
    const method = parseCheckMethod(req.body);

    if (method === "well_known" && !verificationToken) {
      return void res.status(400).json({
        message: "No verification token for this listing. Open the ownership flow first.",
      });
    }

    if (method === "store_listing" && !storeListingCode) {
      return void res.status(400).json({
        message: "No store listing code for this listing. Open the ownership flow first.",
      });
    }

    if (listing.ownershipVerification?.isVerified) {
      return void res.status(200).json({
        ok: true,
        alreadyVerified: true,
        isVerified: true,
        method: listing.ownershipVerification.verifiedVia ?? method,
        dateVerified: listing.ownershipVerification.dateVerified ?? null,
        message: "Ownership is already verified.",
      });
    }

    const result =
      method === "store_listing"
        ? await checkStoreListingVerificationCode(listing, storeListingCode!)
        : await (async () => {
            const webOrigin = resolveListingWebOrigin(listing);
            if (!webOrigin) {
              return {
                ok: false as const,
                method: "well_known" as const,
                message:
                  "Add a Web platform URL or live site URL on your listing before checking website verification.",
              };
            }
            return checkRemoteOwnershipVerificationToken(webOrigin, verificationToken!);
          })();

    if (!result.ok) {
      return void res.status(422).json({
        ok: false,
        isVerified: false,
        method: result.method,
        checkedUrl: result.checkedUrl,
        checkedUrls: result.checkedUrls,
        message: result.message,
      });
    }

    listing.ownershipVerification = {
      isVerified: true,
      verificationToken: verificationToken ?? listing.ownershipVerification?.verificationToken,
      storeListingCode: storeListingCode ?? listing.ownershipVerification?.storeListingCode,
      verifiedVia: result.method,
      dateVerified: new Date(),
    };
    await listing.save();

    return void res.status(200).json({
      ok: true,
      isVerified: true,
      alreadyVerified: false,
      method: result.method,
      verifiedVia: result.method,
      checkedUrl: result.checkedUrl,
      checkedUrls: result.checkedUrls,
      dateVerified: listing.ownershipVerification.dateVerified,
      message: result.message,
    });
  } catch (err) {
    console.log("checkOwnershipVerification error:", err);
    return void res.status(500).json({ message: "Failed to check ownership verification" });
  }
}
