export type RevenueCatOAuthEnv = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
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

  return { clientId, clientSecret, redirectUri };
}

export function isRevenueCatOAuthConfigured(): boolean {
  const { clientId, clientSecret, redirectUri } = getRevenueCatOAuthEnv();
  return Boolean(clientId && clientSecret && redirectUri);
}
