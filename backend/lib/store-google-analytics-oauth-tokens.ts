import type { Credentials } from "google-auth-library";

import User from "../models/user";
import { encryptData } from "../utils/encryption";

/**
 * Persists Google Analytics OAuth tokens for a user.
 *
 * - **Refresh token** is only present on first consent (or after `prompt=consent`).
 *   If Google omits it on a later exchange, we keep the existing ciphertext.
 * - **Access token** is short-lived; we encrypt and store it so background jobs
 *   can call the Data API without asking the user every time (refresh when near
 *   `accessTokenExpiresAt` using `decryptData` + refresh flow - TBD).
 *
 * Values in DB are always **ciphertext** from `encryptData` - never raw tokens.
 */
type GaOauthLean = {
  googleAnalyticsOAuth?: {
    accessTokenEnc?: string | null;
    refreshTokenEnc?: string | null;
  };
};

export async function storeGoogleAnalyticsOAuthTokens(
  userId: string,
  tokens: Credentials,
) {
  const prev = (await User.findById(userId)
    .select("googleAnalyticsOAuth")
    .lean()) as GaOauthLean | null;

  const prevO = prev?.googleAnalyticsOAuth;

  const refreshEnc = tokens.refresh_token
    ? encryptData(tokens.refresh_token)
    : (prevO?.refreshTokenEnc ?? null);

  const accessEnc = tokens.access_token
    ? encryptData(tokens.access_token)
    : (prevO?.accessTokenEnc ?? null);

  const accessTokenExpiresAt =
    tokens.expiry_date != null ? new Date(tokens.expiry_date) : null;

  await User.findByIdAndUpdate(userId, {
    $set: {
      googleAnalyticsOAuth: {
        accessTokenEnc: accessEnc,
        refreshTokenEnc: refreshEnc,
        accessTokenExpiresAt,
      },
    },
  });
}
