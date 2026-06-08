import type { Request, Response } from "express";
import { exchangeRevenueCatAuthorizationCode } from "../../lib/revenue-cat-oauth-api";
import {
  getRevenueCatOAuthEnv,
  logRevenueCatOAuthEnvDiagnostics,
} from "../../lib/revenue-cat-oauth-env";
import { verifyRevenueCatOAuthState } from "../../lib/revenue-cat-oauth-state";
import {
  RevenueCatOAuthStoreError,
  storeRevenueCatOAuthTokens,
} from "../../lib/store-revenue-cat-oauth-tokens";

const LOG_PREFIX = "[revenuecat-oauth]";

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
  const safe =
    message.length > 280 ? `${message.slice(0, 277)}...` : message;
  const params = new URLSearchParams({ rc_error: safe });
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

    console.info(
      `${LOG_PREFIX} callback hit:`,
      JSON.stringify({
        hasCode: Boolean(code),
        hasState: Boolean(state),
        oauthError: err || null,
        oauthErrorDescription: errDesc || null,
      }),
    );

    if (state) {
      try {
        listingId = verifyRevenueCatOAuthState(state).listingId;
      } catch {
        // handled below
      }
    }

    if (err) {
      console.error(
        `${LOG_PREFIX} authorize denied:`,
        JSON.stringify({ err, errDesc, listingId: listingId ?? null }),
      );
      return void res.redirect(
        302,
        errorRedirectUrl(errDesc || err, listingId),
      );
    }

    if (!code || !state) {
      console.error(`${LOG_PREFIX} callback missing code or state`);
      return void res.redirect(
        302,
        errorRedirectUrl("missing_code_or_state", listingId),
      );
    }

    const oauthState = verifyRevenueCatOAuthState(state);
    const userId = oauthState.sub;
    listingId = oauthState.listingId ?? listingId;

    logRevenueCatOAuthEnvDiagnostics("callback before token exchange");

    const { clientId, clientSecret, redirectUri: envRedirectUri } =
      getRevenueCatOAuthEnv();
    const redirectUri =
      oauthState.redirectUri?.trim() || envRedirectUri;

    if (
      oauthState.redirectUri?.trim() &&
      envRedirectUri &&
      oauthState.redirectUri.trim() !== envRedirectUri
    ) {
      console.warn(
        `${LOG_PREFIX} redirect_uri mismatch (using state from /start):`,
        JSON.stringify({
          fromState: oauthState.redirectUri.trim(),
          fromEnv: envRedirectUri,
        }),
      );
    }

    if (!clientId || !clientSecret || !redirectUri) {
      console.error(
        `${LOG_PREFIX} server_not_configured:`,
        JSON.stringify({
          hasClientId: Boolean(clientId),
          hasClientSecret: Boolean(clientSecret),
          hasRedirectUri: Boolean(redirectUri),
        }),
      );
      return void res.redirect(
        302,
        errorRedirectUrl("server_not_configured", listingId),
      );
    }

    const tokens = await exchangeRevenueCatAuthorizationCode({
      code,
      redirectUri,
      clientId,
      clientSecret,
      logMeta: {
        userId,
        listingId: listingId ?? null,
        redirectUriFromState: Boolean(oauthState.redirectUri?.trim()),
      },
    });

    await storeRevenueCatOAuthTokens(userId, tokens);

    console.info(
      `${LOG_PREFIX} callback success:`,
      JSON.stringify({ userId, listingId: listingId ?? null }),
    );

    return void res.redirect(302, verifyRedirectUrl(listingId));
  } catch (e) {
    const detail =
      e instanceof Error
        ? { name: e.name, message: e.message }
        : { message: String(e) };

    console.error(
      `${LOG_PREFIX} callback error:`,
      JSON.stringify({ ...detail, listingId: listingId ?? null }),
    );

    const msg =
      e instanceof RevenueCatOAuthStoreError
        ? "no_refresh_token"
        : e instanceof Error
          ? e.message
          : "callback_failed";

    return void res.redirect(302, errorRedirectUrl(msg, listingId));
  }
}
