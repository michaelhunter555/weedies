import Listing from "../../models/listing";
import { sellerListingExpiredQuery } from "../../lib/seller-listing-expired";

const INACTIVE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Soft-remove expired unsold listings inactive for 30+ days.
 */
export default async function purgeExpiredListings(): Promise<void> {
  const cutoff = new Date(Date.now() - INACTIVE_RETENTION_MS);

  const result = await Listing.deleteMany(
    {
      status: { $in: ["expired", "removed", "draft", "rejected"] } ,
      updatedAt: { $lte: cutoff },
    },
  );

  if (result.deletedCount > 0) {
    console.log(
      `[cron] purgeExpiredListings: removed ${result.deletedCount} inactive expired listings`,
    );
  }
}
