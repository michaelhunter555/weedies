/** Strip sensitive ownership verification fields from listing API responses. */
export function sanitizeListingOwnershipVerification(
  listing: Record<string, unknown>,
  options: { isSeller: boolean },
): Record<string, unknown> {
  const ov = listing.ownershipVerification;
  if (!ov || typeof ov !== "object") {
    const { ownershipVerification: _ov, ...rest } = listing;
    return rest;
  }

  const row = ov as Record<string, unknown>;
  const {
    verificationToken: _token,
    storeListingCode: _storeCode,
    ...safeOv
  } = row;

  if (options.isSeller) {
    return {
      ...listing,
      ownershipVerification: safeOv,
    };
  }

  const { ownershipVerification: _drop, ...rest } = listing;
  const isVerified = row.isVerified === true;
  if (!isVerified) return rest;

  return {
    ...rest,
    ownershipVerification: {
      isVerified: true,
      dateVerified: row.dateVerified ?? null,
    },
  };
}
