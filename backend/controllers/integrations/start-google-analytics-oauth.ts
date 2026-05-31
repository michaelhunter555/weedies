import type { Request, Response } from "express";
import { getGoogleAnalyticsOAuthEnv } from "../../lib/google-analytics-oauth-env";
import { signGoogleAnalyticsOAuthState } from "../../lib/google-analytics-oauth-state";

/**
 * Returns the Google OAuth 2.0 authorization URL for read-only Analytics.
 * This is separate from Firebase Google sign-in - no Firebase APIs involved.
 *
 * Env (see `getGoogleAnalyticsOAuthEnv` for alternate names):
 *   GOOGLE_ANALYTICS_OAUTH_CLIENT_ID - OAuth 2.0 Web client ID (GCP)
 *   GOOGLE_ANALYTICS_OAUTH_REDIRECT_URI - must match GCP console, e.g.
 *       http://localhost:5001/api/integrations/google-analytics/callback
 */
export async function startGoogleAnalyticsOAuth(req: Request, res: Response) {
  try {
    const { clientId, redirectUri } = getGoogleAnalyticsOAuthEnv();

    if (!clientId || !redirectUri) {
      return void res.status(503).json({
        message:
          "Google Analytics OAuth is not configured on the server. Set GOOGLE_ANALYTICS_OAUTH_CLIENT_ID and GOOGLE_ANALYTICS_OAUTH_REDIRECT_URI (or GOOGLE_ANALYTICS_CLIENT_ID and GOOGLE_ANALYTICS_REDIRECT_URI) in the backend .env.",
        code: "GA_OAUTH_NOT_CONFIGURED",
      });
    }

    const userId = req.user?.userId;
    if (!userId) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    const listingId =
      typeof req.query.listingId === "string"
        ? req.query.listingId.trim()
        : undefined;

    const state = signGoogleAnalyticsOAuthState(userId, listingId);

    const scope = [
      "https://www.googleapis.com/auth/analytics.readonly",
      "openid",
      "https://www.googleapis.com/auth/userinfo.email",
    ].join(" ");

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope,
      access_type: "offline",
      prompt: "consent",
      state,
    });

    const authorizationUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return void res.status(200).json({ authorizationUrl });
  } catch (err) {
    console.error("startGoogleAnalyticsOAuth:", err);
    return void res.status(500).json({ message: "Failed to start Google OAuth" });
  }
}
