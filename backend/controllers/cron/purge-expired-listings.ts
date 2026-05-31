import Listing from "../../models/listing";
import { sellerListingExpiredQuery } from "../../lib/seller-listing-expired";

const INACTIVE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Soft-remove expired unsold listings inactive for 30+ days.
 */
export default async function purgeExpiredListings(): Promise<void> {
  const cutoff = new Date(Date.now() - INACTIVE_RETENTION_MS);

  const result = await Listing.updateMany(
    {
      ...sellerListingExpiredQuery(),
      $or: [
        { expiredAt: { $lte: cutoff } },
        {
          expiredAt: { $exists: false },
          auctionFinalizedAt: { $lte: cutoff },
        },
        {
          expiredAt: { $exists: false },
          updatedAt: { $lte: cutoff },
        },
      ],
    },
    { $set: { status: "removed" } },
  );

  if (result.modifiedCount > 0) {
    console.log(
      `[cron] purgeExpiredListings: removed ${result.modifiedCount} inactive expired listings`,
    );
  }
}
