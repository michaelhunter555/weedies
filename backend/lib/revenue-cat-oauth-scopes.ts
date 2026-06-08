/** Scopes requested during RevenueCat OAuth connect (listing verification). */
export const REVENUE_CAT_OAUTH_SCOPES = [
  "project_configuration:projects:read",
  "customer_information:subscriptions:read",
  "customer_information:customers:read",
  "customer_information:purchases:read",
  "charts_metrics:overview:read",
  "charts_metrics:charts:read",
] as const;

export function revenueCatOAuthScopeString(): string {
  return REVENUE_CAT_OAUTH_SCOPES.join(" ");
}
