import type { Request, Response } from "express";
import {
  getRevenueCatOAuthEnv,
  isRevenueCatOAuthConfigured,
} from "../../lib/revenue-cat-oauth-env";
import { revenueCatOAuthScopeString } from "../../lib/revenue-cat-oauth-scopes";
import { signRevenueCatOAuthState } from "../../lib/revenue-cat-oauth-state";

const AUTHORIZE_URL = "https://api.revenuecat.com/oauth2/authorize";

/**
 * Returns the RevenueCat OAuth authorization URL (confidential client).
 *
 * Env:
 *   REVENUE_CAT_CLIENT_ID
 *   REVENUE_CAT_CLIENT_SECRET
 *   REVENUE_CAT_REDIRECT_URI e.g. https://your-api.herokuapp.com/api/integrations/revenuecat/callback
 */
export async function startRevenueCatOAuth(req: Request, res: Response) {
  try {
    if (!isRevenueCatOAuthConfigured()) {
      return void res.status(503).json({
        message:
          "RevenueCat OAuth is not configured. Set REVENUE_CAT_CLIENT_ID, REVENUE_CAT_CLIENT_SECRET, and REVENUE_CAT_REDIRECT_URI in the backend .env.",
        code: "RC_OAUTH_NOT_CONFIGURED",
      });
    }

    const userId = req.user?.userId;
    if (!userId) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    const { clientId, redirectUri } = getRevenueCatOAuthEnv();

    const listingId =
      typeof req.query.listingId === "string"
        ? req.query.listingId.trim()
        : undefined;

    const state = signRevenueCatOAuthState(userId, listingId);

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: revenueCatOAuthScopeString(),
      state,
    });

    const authorizationUrl = `${AUTHORIZE_URL}?${params.toString()}`;

    return void res.status(200).json({ authorizationUrl });
  } catch (err) {
    console.error("startRevenueCatOAuth:", err);
    return void res.status(500).json({ message: "Failed to start RevenueCat OAuth" });
  }
}
