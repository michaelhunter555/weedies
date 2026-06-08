export type RevenueCatOAuthEnv = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  /** When true, use PKCE (no client_secret on token exchange). */
  publicClient: boolean;
};

export function getRevenueCatOAuthEnv(): RevenueCatOAuthEnv {
  const clientId =
    process.env.REVENUE_CAT_CLIENT_ID?.trim() ||
    process.env.REVENUECAT_CLIENT_ID?.trim() ||
    "";
  const clientSecret =
    process.env.REVENUE_CAT_CLIENT_SECRET?.trim() ||
    process.env.REVENUECAT_CLIENT_SECRET?.trim() ||
    "";
  const redirectUri =
    process.env.REVENUE_CAT_REDIRECT_URI?.trim() ||
    process.env.REVENUECAT_REDIRECT_URI?.trim() ||
    "";
  const publicClient =
    process.env.REVENUE_CAT_OAUTH_PUBLIC_CLIENT === "true" ||
    process.env.REVENUECAT_OAUTH_PUBLIC_CLIENT === "true";

  return { clientId, clientSecret, redirectUri, publicClient };
}

export function isRevenueCatOAuthConfigured(): boolean {
  const { clientId, redirectUri, clientSecret, publicClient } =
    getRevenueCatOAuthEnv();
  if (!clientId || !redirectUri) return false;
  if (publicClient) return true;
  return Boolean(clientSecret);
}
