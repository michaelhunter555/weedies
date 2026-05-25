import type { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import { getGoogleAnalyticsOAuthEnv } from "../../lib/google-analytics-oauth-env";
import { verifyGoogleAnalyticsOAuthState } from "../../lib/google-analytics-oauth-state";
import { storeGoogleAnalyticsOAuthTokens } from "../../lib/store-google-analytics-oauth-tokens";

function clientOrigin(): string {
  const raw = process.env.CLIENT_ORIGIN?.trim();
  if (raw) {
    const first = raw.split(",")[0]?.trim();
    if (first) return first;
  }
  return "http://localhost:3000";
}

/**
 * Google redirects the **browser** here with `?code=&state=` (no Bearer token).
 * This handler runs **only on the server**: it exchanges `code` for tokens via
 * Google's token endpoint - **`refresh_token` and `access_token` are returned
 * in that HTTPS response to your backend**, never to the client.
 *
 * Tokens are encrypted (`utils/encryption/encryptData`) and saved on
 * `User.googleAnalyticsOAuth` by `storeGoogleAnalyticsOAuthTokens`.
 *
 * Env: see `getGoogleAnalyticsOAuthEnv` (OAuth client id/secret/redirect), ENCRYPTION_KEY.
 */
export async function googleAnalyticsOAuthCallback(req: Request, res: Response) {
  const base = `${clientOrigin()}/products/verify`;

  try {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";
    const err = typeof req.query.error === "string" ? req.query.error : "";

    if (err) {
      return void res.redirect(
        302,
        `${base}?ga_error=${encodeURIComponent(err)}`,
      );
    }

    if (!code || !state) {
      return void res.redirect(302, `${base}?ga_error=missing_code_or_state`);
    }

    const userId = verifyGoogleAnalyticsOAuthState(state);

    const { clientId, clientSecret, redirectUri } = getGoogleAnalyticsOAuthEnv();

    if (!clientId || !clientSecret || !redirectUri) {
      return void res.redirect(302, `${base}?ga_error=server_not_configured`);
    }

    const oauth2 = new OAuth2Client(clientId, clientSecret, redirectUri);
    const { tokens } = await oauth2.getToken(code);

    await storeGoogleAnalyticsOAuthTokens(userId, tokens);

    return void res.redirect(302, `${base}?ga_connected=1`);
  } catch (e) {
    console.error("googleAnalyticsOAuthCallback:", e);
    const msg = e instanceof Error ? e.message : "callback_failed";
    return void res.redirect(302, `${base}?ga_error=${encodeURIComponent(msg)}`);
  }
}
