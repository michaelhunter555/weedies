import type { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import { getGoogleAnalyticsOAuthEnv } from "../../lib/google-analytics-oauth-env";
import { verifyGoogleAnalyticsOAuthState } from "../../lib/google-analytics-oauth-state";
import {
  GoogleAnalyticsOAuthStoreError,
  storeGoogleAnalyticsOAuthTokens,
} from "../../lib/store-google-analytics-oauth-tokens";

function clientOrigin(): string {
  const raw = process.env.CLIENT_ORIGIN?.trim();
  if (raw) {
    const first = raw.split(",")[0]?.trim();
    if (first) return first;
  }
  return "http://localhost:3000";
}

function verifyRedirectUrl(listingId?: string): string {
  const base = `${clientOrigin()}/products/verify`;
  const params = new URLSearchParams({ ga_connected: "1" });
  const lid = listingId?.trim();
  if (lid) params.set("listingId", lid);
  return `${base}?${params.toString()}`;
}

function errorRedirectUrl(message: string, listingId?: string): string {
  const base = `${clientOrigin()}/products/verify`;
  const params = new URLSearchParams({
    ga_error: message,
  });
  const lid = listingId?.trim();
  if (lid) params.set("listingId", lid);
  return `${base}?${params.toString()}`;
}

/**
 * Google redirects the **browser** here with `?code=&state=` (no Bearer token).
 * Tokens are encrypted and saved on `User.googleAnalyticsOAuth`.
 */
export async function googleAnalyticsOAuthCallback(req: Request, res: Response) {
  let listingId: string | undefined;

  try {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";
    const err = typeof req.query.error === "string" ? req.query.error : "";

    if (state) {
      try {
        listingId = verifyGoogleAnalyticsOAuthState(state).listingId;
      } catch {
        // state invalid - handled below if we need userId
      }
    }

    if (err) {
      return void res.redirect(
        302,
        errorRedirectUrl(err, listingId),
      );
    }

    if (!code || !state) {
      return void res.redirect(
        302,
        errorRedirectUrl("missing_code_or_state", listingId),
      );
    }

    const oauthState = verifyGoogleAnalyticsOAuthState(state);
    const userId = oauthState.sub;
    listingId = oauthState.listingId ?? listingId;

    const { clientId, clientSecret, redirectUri } = getGoogleAnalyticsOAuthEnv();

    if (!clientId || !clientSecret || !redirectUri) {
      return void res.redirect(
        302,
        errorRedirectUrl("server_not_configured", listingId),
      );
    }

    const oauth2 = new OAuth2Client(clientId, clientSecret, redirectUri);
    const { tokens } = await oauth2.getToken(code);

    await storeGoogleAnalyticsOAuthTokens(userId, tokens);

    return void res.redirect(302, verifyRedirectUrl(listingId));
  } catch (e) {
    console.error("googleAnalyticsOAuthCallback:", e);
    const msg =
      e instanceof GoogleAnalyticsOAuthStoreError
        ? "no_refresh_token"
        : e instanceof Error
          ? e.message
          : "callback_failed";
    return void res.redirect(302, errorRedirectUrl(msg, listingId));
  }
}
