/**
 * Google Analytics OAuth (GCP OAuth 2.0 Web client) - server env only.
 *
 * Supported names (first match wins in each group):
 * - Client ID: `GOOGLE_ANALYTICS_OAUTH_CLIENT_ID` or `GOOGLE_ANALYTICS_CLIENT_ID`
 * - Secret: `GOOGLE_ANALYTICS_OAUTH_CLIENT_SECRET` or `GOOGLE_ANALYTICS_CLIENT_SECRET`
 * - Redirect: `GOOGLE_ANALYTICS_OAUTH_REDIRECT_URI` or `GOOGLE_ANALYTICS_REDIRECT_URI`
 */
export function getGoogleAnalyticsOAuthEnv(): {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
} {
  const clientId =
    process.env.GOOGLE_ANALYTICS_OAUTH_CLIENT_ID?.trim() ||
    process.env.GOOGLE_ANALYTICS_CLIENT_ID?.trim() ||
    "";
  const clientSecret =
    process.env.GOOGLE_ANALYTICS_OAUTH_CLIENT_SECRET?.trim() ||
    process.env.GOOGLE_ANALYTICS_CLIENT_SECRET?.trim() ||
    "";
  const redirectUri =
    process.env.GOOGLE_ANALYTICS_OAUTH_REDIRECT_URI?.trim() ||
    process.env.GOOGLE_ANALYTICS_REDIRECT_URI?.trim() ||
    "";
  return { clientId, clientSecret, redirectUri };
}
