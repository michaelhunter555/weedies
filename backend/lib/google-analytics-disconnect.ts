import mongoose from "mongoose";

import { getGoogleAnalyticsOAuthEnv } from "./google-analytics-oauth-env";
import User from "../models/user";
import Listing from "../models/listing";
import { decryptData } from "../utils/encryption/decryptData";

/** Remove stored GA OAuth credentials for a user. */
export async function clearGoogleAnalyticsOAuthForUser(userId: string): Promise<void> {
  await User.findByIdAndUpdate(userId, {
    $set: {
      googleAnalyticsOAuth: {
        accessTokenEnc: null,
        refreshTokenEnc: null,
        accessTokenExpiresAt: null,
      },
    },
  });
}

/** Best-effort revoke at Google so the next connect issues a fresh refresh token. */
async function revokeGoogleToken(token: string): Promise<void> {
  try {
    const body = new URLSearchParams({ token });
    await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
  } catch (err) {
    console.warn("revokeGoogleToken:", err);
  }
}

export async function revokeStoredGoogleAnalyticsTokens(userId: string): Promise<void> {
  const doc = await User.findById(userId).select("googleAnalyticsOAuth");
  const refreshEnc = doc?.googleAnalyticsOAuth?.refreshTokenEnc;
  if (refreshEnc) {
    try {
      await revokeGoogleToken(decryptData(refreshEnc));
    } catch (err) {
      console.warn("revokeStoredGoogleAnalyticsTokens refresh:", err);
    }
  }
  await clearGoogleAnalyticsOAuthForUser(userId);
}

export async function clearListingGoogleAnalyticsFields(
  listingId: string,
  sellerId: string,
): Promise<void> {
  if (!mongoose.isValidObjectId(listingId)) return;
  await Listing.updateOne(
    {
      _id: new mongoose.Types.ObjectId(listingId),
      sellerId: new mongoose.Types.ObjectId(sellerId),
    },
    {
      $unset: {
        googleAnalyticsPropertyResourceName: "",
        googleAnalyticsPropertyDisplayName: "",
      },
    },
  );
}

export async function disconnectGoogleAnalyticsForUser(input: {
  userId: string;
  listingId?: string;
  clearListingProperty?: boolean;
}): Promise<void> {
  const { userId, listingId, clearListingProperty } = input;

  const { clientId, clientSecret } = getGoogleAnalyticsOAuthEnv();
  if (clientId && clientSecret) {
    await revokeStoredGoogleAnalyticsTokens(userId);
  } else {
    await clearGoogleAnalyticsOAuthForUser(userId);
  }

  if (clearListingProperty && listingId) {
    await clearListingGoogleAnalyticsFields(listingId, userId);
  }
}
