import type { Request, Response } from "express";
import { exchangeRevenueCatAuthorizationCode } from "../../lib/revenue-cat-oauth-api";
import { getRevenueCatOAuthEnv } from "../../lib/revenue-cat-oauth-env";
import { verifyRevenueCatOAuthState } from "../../lib/revenue-cat-oauth-state";
import {
  RevenueCatOAuthStoreError,
  storeRevenueCatOAuthTokens,
} from "../../lib/store-revenue-cat-oauth-tokens";

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
  const params = new URLSearchParams({ rc_connected: "1" });
  const lid = listingId?.trim();
  if (lid) params.set("listingId", lid);
  return `${base}?${params.toString()}`;
}

function errorRedirectUrl(message: string, listingId?: string): string {
  const base = `${clientOrigin()}/products/verify`;
  const params = new URLSearchParams({ rc_error: message });
  const lid = listingId?.trim();
  if (lid) params.set("listingId", lid);
  return `${base}?${params.toString()}`;
}

/** Browser redirect from RevenueCat with `?code=&state=` (no Bearer token). */
export async function revenueCatOAuthCallback(req: Request, res: Response) {
  let listingId: string | undefined;

  try {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";
    const err = typeof req.query.error === "string" ? req.query.error : "";
    const errDesc =
      typeof req.query.error_description === "string"
        ? req.query.error_description
        : "";

    if (state) {
      try {
        listingId = verifyRevenueCatOAuthState(state).listingId;
      } catch {
        // handled below
      }
    }

    if (err) {
      return void res.redirect(
        302,
        errorRedirectUrl(errDesc || err, listingId),
      );
    }

    if (!code || !state) {
      return void res.redirect(
        302,
        errorRedirectUrl("missing_code_or_state", listingId),
      );
    }

    const oauthState = verifyRevenueCatOAuthState(state);
    const userId = oauthState.sub;
    listingId = oauthState.listingId ?? listingId;

    const { clientId, clientSecret, redirectUri, publicClient } =
      getRevenueCatOAuthEnv();

    if (!clientId || !redirectUri) {
      return void res.redirect(
        302,
        errorRedirectUrl("server_not_configured", listingId),
      );
    }

    const tokens = await exchangeRevenueCatAuthorizationCode({
      code,
      redirectUri,
      clientId,
      clientSecret: publicClient ? undefined : clientSecret || undefined,
      codeVerifier: oauthState.codeVerifier,
    });

    await storeRevenueCatOAuthTokens(userId, tokens);

    return void res.redirect(302, verifyRedirectUrl(listingId));
  } catch (e) {
    console.error("revenueCatOAuthCallback:", e);
    const msg =
      e instanceof RevenueCatOAuthStoreError
        ? "no_refresh_token"
        : e instanceof Error
          ? e.message
          : "callback_failed";
    return void res.redirect(302, errorRedirectUrl(msg, listingId));
  }
}
