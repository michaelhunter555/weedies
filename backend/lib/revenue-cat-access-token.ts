import User from "../models/user";
import { getRevenueCatOAuthEnv } from "./revenue-cat-oauth-env";
import { refreshRevenueCatTokens } from "./revenue-cat-oauth-api";
import { decryptData } from "../utils/encryption/decryptData";
import { encryptData } from "../utils/encryption/encryptData";

export const RC_NEEDS_RECONNECT = "RC_NEEDS_RECONNECT";

export class RevenueCatReconnectError extends Error {
  code = RC_NEEDS_RECONNECT;
  status = 412;
  constructor(message = "RevenueCat access expired. Reconnect to continue.") {
    super(message);
    this.name = "RevenueCatReconnectError";
  }
}

function isInvalidGrant(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("invalid_grant") || lower.includes("invalid refresh");
}

async function clearRevenueCatCredentials(userId: string) {
  try {
    await User.findByIdAndUpdate(userId, {
      $set: {
        revenueCatOAuth: {
          accessTokenEnc: null,
          refreshTokenEnc: null,
          accessTokenExpiresAt: null,
        },
      },
    });
  } catch (err) {
    console.error("clearRevenueCatCredentials:", err);
  }
}

export async function getValidRevenueCatAccessToken(
  userId: string,
): Promise<string> {
  const { clientId, clientSecret, publicClient } = getRevenueCatOAuthEnv();
  if (!clientId) {
    throw new RevenueCatReconnectError("RevenueCat OAuth is not configured.");
  }

  const doc = await User.findById(userId).select("revenueCatOAuth");
  const o = doc?.revenueCatOAuth;
  if (!o?.refreshTokenEnc) {
    throw new RevenueCatReconnectError("Connect RevenueCat first.");
  }

  const now = Date.now();
  const expMs = o.accessTokenExpiresAt
    ? new Date(o.accessTokenExpiresAt).getTime()
    : 0;
  const bufferMs = 120_000;

  if (o.accessTokenEnc && expMs > now + bufferMs) {
    return decryptData(o.accessTokenEnc);
  }

  const refresh_token = decryptData(o.refreshTokenEnc);

  let tokens;
  try {
    tokens = await refreshRevenueCatTokens({
      refreshToken: refresh_token,
      clientId,
      clientSecret: publicClient ? undefined : clientSecret || undefined,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isInvalidGrant(msg)) {
      await clearRevenueCatCredentials(userId);
      throw new RevenueCatReconnectError();
    }
    throw err;
  }

  if (!tokens.access_token) {
    await clearRevenueCatCredentials(userId);
    throw new RevenueCatReconnectError();
  }

  const accessTokenEnc = encryptData(tokens.access_token);
  const refreshTokenEnc = tokens.refresh_token
    ? encryptData(tokens.refresh_token)
    : o.refreshTokenEnc;
  const accessTokenExpiresAt =
    tokens.expires_in != null && tokens.expires_in > 0
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

  await User.findByIdAndUpdate(userId, {
    $set: {
      revenueCatOAuth: {
        accessTokenEnc,
        refreshTokenEnc,
        accessTokenExpiresAt,
      },
    },
  });

  return tokens.access_token;
}
