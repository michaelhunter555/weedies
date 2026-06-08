import type { Listing } from "../models/listing";
import { signAppVerificationToken } from "./jwt";
import { generateStoreListingVerificationCode } from "./ownership-verification";

type OwnershipFields = NonNullable<Listing["ownershipVerification"]>;

export function buildOwnershipVerificationFields(
  listingId: string,
  sellerId: string,
  existing?: OwnershipFields | null,
): OwnershipFields {
  const verificationToken =
    existing?.verificationToken?.trim() ||
    signAppVerificationToken({
      typ: "app_verification",
      sub: listingId,
      sellerId,
    });

  const storeListingCode =
    existing?.storeListingCode?.trim() || generateStoreListingVerificationCode();

  return {
    isVerified: existing?.isVerified ?? false,
    verificationToken,
    storeListingCode,
    verifiedVia: existing?.verifiedVia ?? null,
    dateVerified: existing?.dateVerified ?? null,
  };
}
