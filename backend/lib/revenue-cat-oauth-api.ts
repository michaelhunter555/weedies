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
    return { error: "invalid_response", error_description: text.slice(0, 200) };
  }
}

export async function exchangeRevenueCatAuthorizationCode(params: {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret?: string;
  codeVerifier?: string;
}): Promise<RevenueCatTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: params.clientId,
  });
  if (params.clientSecret) {
    body.set("client_secret", params.clientSecret);
  }
  if (params.codeVerifier) {
    body.set("code_verifier", params.codeVerifier);
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = await parseTokenResponse(res);
  if (!res.ok) {
    const msg =
      data.error_description ||
      data.error ||
      `RevenueCat token exchange failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export async function refreshRevenueCatTokens(params: {
  refreshToken: string;
  clientId: string;
  clientSecret?: string;
}): Promise<RevenueCatTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: params.refreshToken,
    client_id: params.clientId,
  });
  if (params.clientSecret) {
    body.set("client_secret", params.clientSecret);
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = await parseTokenResponse(res);
  if (!res.ok) {
    const msg =
      data.error_description ||
      data.error ||
      `RevenueCat token refresh failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

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
