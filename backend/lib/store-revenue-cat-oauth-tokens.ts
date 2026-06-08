import User from "../models/user";
import { encryptData } from "../utils/encryption";

type RcOauthLean = {
  revenueCatOAuth?: {
    accessTokenEnc?: string | null;
    refreshTokenEnc?: string | null;
  };
};

export class RevenueCatOAuthStoreError extends Error {
  constructor(
    message = "RevenueCat did not return a refresh token. Disconnect and connect again.",
  ) {
    super(message);
    this.name = "RevenueCatOAuthStoreError";
  }
}

export async function storeRevenueCatOAuthTokens(
  userId: string,
  tokens: {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  },
) {
  const prev = (await User.findById(userId)
    .select("revenueCatOAuth")
    .lean()) as RcOauthLean | null;

  const prevO = prev?.revenueCatOAuth;

  const refreshEnc = tokens.refresh_token
    ? encryptData(tokens.refresh_token)
    : (prevO?.refreshTokenEnc ?? null);

  if (!refreshEnc) {
    throw new RevenueCatOAuthStoreError();
  }

  const accessEnc = tokens.access_token
    ? encryptData(tokens.access_token)
    : (prevO?.accessTokenEnc ?? null);

  const accessTokenExpiresAt =
    tokens.expires_in != null && tokens.expires_in > 0
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

  await User.findByIdAndUpdate(userId, {
    $set: {
      revenueCatOAuth: {
        accessTokenEnc: accessEnc,
        refreshTokenEnc: refreshEnc,
        accessTokenExpiresAt,
      },
    },
  });
}
