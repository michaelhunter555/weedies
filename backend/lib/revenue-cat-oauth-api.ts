const TOKEN_URL = "https://api.revenuecat.com/oauth2/token";

export type RevenueCatTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

async function parseTokenResponse(res: Response): Promise<RevenueCatTokenResponse> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as RevenueCatTokenResponse;
  } catch {
    return { error: "invalid_response", error_description: text.slice(0, 500) };
  }
}

/**
 * Exchange or refresh tokens (confidential client).
 * RevenueCat docs: client_id + client_secret in the form body (client_secret_post).
 * Bearer is only used later for API calls with the access token (see revenueCatApiGet).
 */
async function postRevenueCatToken(
  body: URLSearchParams,
  clientId: string,
  clientSecret: string,
): Promise<{ res: Response; data: RevenueCatTokenResponse }> {
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });

  const data = await parseTokenResponse(res);
  return { res, data };
}

export function formatRevenueCatTokenError(data: RevenueCatTokenResponse): string {
  const raw =
    data.error_description?.trim() || data.error?.trim() || "Token request failed";

  if (
    raw.includes("client_secret") ||
    raw.includes("cannot authenticate") ||
    raw.includes("invalid_client")
  ) {
    return [
      "RevenueCat rejected the OAuth client credentials at token exchange.",
      "Confirm REVENUE_CAT_CLIENT_ID and REVENUE_CAT_CLIENT_SECRET on the server that handles /api/integrations/revenuecat/callback.",
      `Details: ${raw}`,
    ].join(" ");
  }

  return raw;
}

export async function exchangeRevenueCatAuthorizationCode(params: {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}): Promise<RevenueCatTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: params.redirectUri,
  });

  const { res, data } = await postRevenueCatToken(
    body,
    params.clientId,
    params.clientSecret,
  );

  if (!res.ok) {
    throw new Error(formatRevenueCatTokenError(data));
  }
  return data;
}

export async function refreshRevenueCatTokens(params: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}): Promise<RevenueCatTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: params.refreshToken,
  });

  const { res, data } = await postRevenueCatToken(
    body,
    params.clientId,
    params.clientSecret,
  );

  if (!res.ok) {
    throw new Error(formatRevenueCatTokenError(data));
  }
  return data;
}

/** API requests after OAuth: Authorization: Bearer atk_... */
export async function revenueCatApiGet<T>(
  path: string,
  accessToken: string,
): Promise<T> {
  const url = path.startsWith("http")
    ? path
    : `https://api.revenuecat.com${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  const text = await res.text();
  if (!res.ok) {
    let message = `RevenueCat API error (${res.status})`;
    try {
      const err = JSON.parse(text) as { message?: string };
      if (err.message) message = err.message;
    } catch {
      if (text) message = text.slice(0, 200);
    }
    throw new Error(message);
  }

  if (!text) return {} as T;
  return JSON.parse(text) as T;
}
