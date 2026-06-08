import Listing from "../models/listing";
import User from "../models/user";

export async function disconnectRevenueCatForUser(params: {
  userId: string;
  listingId?: string;
  clearListingProject?: boolean;
}) {
  const { userId, listingId, clearListingProject } = params;

  await User.findByIdAndUpdate(userId, {
    $set: {
      revenueCatOAuth: {
        accessTokenEnc: null,
        refreshTokenEnc: null,
        accessTokenExpiresAt: null,
      },
    },
  });

  if (clearListingProject && listingId) {
    await Listing.findOneAndUpdate(
      { _id: listingId, sellerId: userId },
      {
        $set: {
          revenueCatProjectId: null,
          revenueCatProjectDisplayName: null,
        },
      },
    );
  }
}
