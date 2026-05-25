import { OAuth2Client, type Credentials } from "google-auth-library";

import { getGoogleAnalyticsOAuthEnv } from "./google-analytics-oauth-env";
import User from "../models/user";
import { decryptData } from "../utils/encryption/decryptData";
import { encryptData } from "../utils/encryption/encryptData";

function oauthClient() {
  const { clientId, clientSecret, redirectUri } = getGoogleAnalyticsOAuthEnv();
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google Analytics OAuth is not configured on the server.");
  }
  return new OAuth2Client(clientId, clientSecret, redirectUri);
}

/** Code thrown when the user must reconnect Google Analytics. */
export const GA_NEEDS_RECONNECT = "GA_NEEDS_RECONNECT";

export class GoogleAnalyticsReconnectError extends Error {
  code = GA_NEEDS_RECONNECT;
  status = 412;
  constructor(message = "Google Analytics access expired. Reconnect to continue.") {
    super(message);
  }
}

type GaxiosLike = {
  code?: string | number;
  status?: number;
  response?: {
    data?: { error?: string; error_description?: string };
  };
};

/** Did Google reject our refresh_token? */
function isInvalidGrantError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as GaxiosLike;
  const reason = e.response?.data?.error;
  if (reason === "invalid_grant") return true;
  if (e.status === 400 && reason === "invalid_grant") return true;
  return false;
}

async function clearGoogleAnalyticsCredentials(userId: string) {
  try {
    await User.findByIdAndUpdate(userId, {
      $set: {
        googleAnalyticsOAuth: {
          accessTokenEnc: null,
          refreshTokenEnc: null,
          accessTokenExpiresAt: null,
        },
      },
    });
  } catch (err) {
    console.error("clearGoogleAnalyticsCredentials:", err);
  }
}

/**
 * Returns a valid Google OAuth access token for Analytics Admin / Data APIs,
 * refreshing and re-encrypting at-rest credentials when needed.
 *
 * Throws `GoogleAnalyticsReconnectError` when the stored refresh token is no
 * longer accepted by Google (revoked, password change, dev-mode 7d expiry).
 * The seller's stored tokens are wiped so the next visit shows "Reconnect".
 */
export async function getValidGoogleAnalyticsAccessToken(
  userId: string,
): Promise<string> {
  const doc = await User.findById(userId).select("googleAnalyticsOAuth");
  const o = doc?.googleAnalyticsOAuth;
  if (!o?.refreshTokenEnc) {
    throw new GoogleAnalyticsReconnectError("Connect Google Analytics first.");
  }

  const refresh_token = decryptData(o.refreshTokenEnc);
  const oauth2 = oauthClient();
  oauth2.setCredentials({ refresh_token });

  const now = Date.now();
  const expMs = o.accessTokenExpiresAt
    ? new Date(o.accessTokenExpiresAt).getTime()
    : 0;
  const bufferMs = 120_000;

  if (o.accessTokenEnc && expMs > now + bufferMs) {
    return decryptData(o.accessTokenEnc);
  }

  // `refreshAccessToken()` is typed as `void` (it's the deprecated callback
  // API) but at runtime returns `{ credentials, res }`. Cast through the
  // documented shape so we keep tsc happy without falling back to `any`.
  let credentials: Credentials;
  try {
    const result = (await (
      oauth2.refreshAccessToken as unknown as () => Promise<{
        credentials: Credentials;
      }>
    )()) ?? { credentials: {} };
    credentials = result.credentials ?? {};
  } catch (err) {
    if (isInvalidGrantError(err)) {
      await clearGoogleAnalyticsCredentials(userId);
      throw new GoogleAnalyticsReconnectError();
    }
    throw err;
  }

  if (!credentials.access_token) {
    await clearGoogleAnalyticsCredentials(userId);
    throw new GoogleAnalyticsReconnectError();
  }

  const accessTokenEnc = encryptData(credentials.access_token);
  const refreshTokenEnc = credentials.refresh_token
    ? encryptData(credentials.refresh_token)
    : o.refreshTokenEnc;
  const accessTokenExpiresAt =
    credentials.expiry_date != null
      ? new Date(credentials.expiry_date)
      : null;

  await User.findByIdAndUpdate(userId, {
    $set: {
      googleAnalyticsOAuth: {
        accessTokenEnc,
        refreshTokenEnc,
        accessTokenExpiresAt,
      },
    },
  });

  return credentials.access_token;
}
