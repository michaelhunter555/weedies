import { OAuth2Client } from "google-auth-library";

import { isAllowedGoogleOAuthRedirectUri } from "./google-oauth-redirect";

/** Exchange an authorization code from the Google redirect flow for an ID token. */
export async function exchangeGoogleAuthCode(
  code: string,
  redirectUri: string,
): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET for Google OAuth redirect",
    );
  }

  if (!isAllowedGoogleOAuthRedirectUri(redirectUri)) {
    throw new Error("redirect_uri is not allowed");
  }

  const oauth = new OAuth2Client(clientId, clientSecret, redirectUri);
  const { tokens } = await oauth.getToken({ code, redirect_uri: redirectUri });
  const idToken = tokens.id_token;
  if (!idToken) {
    throw new Error("Google did not return an id_token");
  }
  return idToken;
}
