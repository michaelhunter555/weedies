import type { Request, Response } from "express";
import { createPkcePair } from "../../lib/revenue-cat-oauth-pkce";
import {
  getRevenueCatOAuthEnv,
  isRevenueCatOAuthConfigured,
} from "../../lib/revenue-cat-oauth-env";
import { revenueCatOAuthScopeString } from "../../lib/revenue-cat-oauth-scopes";
import { signRevenueCatOAuthState } from "../../lib/revenue-cat-oauth-state";

const AUTHORIZE_URL = "https://api.revenuecat.com/oauth2/authorize";

/**
 * Returns the RevenueCat OAuth authorization URL.
 *
 * Env:
 *   REVENUE_CAT_CLIENT_ID
 *   REVENUE_CAT_CLIENT_SECRET (confidential client)
 *   REVENUE_CAT_REDIRECT_URI e.g. http://localhost:5001/api/integrations/revenuecat/callback
 *   REVENUE_CAT_OAUTH_PUBLIC_CLIENT=true (optional, enables PKCE, no secret on token exchange)
 */
export async function startRevenueCatOAuth(req: Request, res: Response) {
  try {
    if (!isRevenueCatOAuthConfigured()) {
      return void res.status(503).json({
        message:
          "RevenueCat OAuth is not configured. Set REVENUE_CAT_CLIENT_ID, REVENUE_CAT_REDIRECT_URI, and REVENUE_CAT_CLIENT_SECRET in the backend .env.",
        code: "RC_OAUTH_NOT_CONFIGURED",
      });
    }

    const userId = req.user?.userId;
    if (!userId) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    const { clientId, redirectUri, publicClient } = getRevenueCatOAuthEnv();

    const listingId =
      typeof req.query.listingId === "string"
        ? req.query.listingId.trim()
        : undefined;

    let codeVerifier: string | undefined;
    let codeChallenge: string | undefined;
    if (publicClient) {
      const pkce = createPkcePair();
      codeVerifier = pkce.codeVerifier;
      codeChallenge = pkce.codeChallenge;
    }

    const state = signRevenueCatOAuthState(userId, listingId, codeVerifier);

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: revenueCatOAuthScopeString(),
      state,
    });

    if (codeChallenge) {
      params.set("code_challenge", codeChallenge);
      params.set("code_challenge_method", "S256");
    }

    const authorizationUrl = `${AUTHORIZE_URL}?${params.toString()}`;

    return void res.status(200).json({ authorizationUrl });
  } catch (err) {
    console.error("startRevenueCatOAuth:", err);
    return void res.status(500).json({ message: "Failed to start RevenueCat OAuth" });
  }
}
