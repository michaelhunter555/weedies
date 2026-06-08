const TOKEN_URL = "https://api.revenuecat.com/oauth2/token";
const LOG_PREFIX = "[revenuecat-oauth]";

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

function logTokenExchangeFailure(
  grantType: string,
  res: Response,
  data: RevenueCatTokenResponse,
  meta: Record<string, unknown>,
) {
  console.error(
    `${LOG_PREFIX} token exchange failed:`,
    JSON.stringify({
      grantType,
      httpStatus: res.status,
      error: data.error ?? null,
      error_description: data.error_description ?? null,
      ...meta,
    }),
  );
}

type ClientAuthMethod = "client_secret_post" | "client_secret_basic";

/**
 * Confidential client: client_id + client_secret in form body (RevenueCat docs).
 * Falls back to HTTP Basic (RFC 6749 §3.2.1) without body credentials if post fails.
 * Bearer is only for API calls after you have atk_... (see revenueCatApiGet).
 */
async function postRevenueCatToken(
  body: URLSearchParams,
  clientId: string,
  clientSecret: string,
  grantType: string,
  authMethod: ClientAuthMethod,
  meta: Record<string, unknown> = {},
): Promise<{ res: Response; data: RevenueCatTokenResponse }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  };

  if (authMethod === "client_secret_post") {
    body.set("client_id", clientId);
    body.set("client_secret", clientSecret);
  } else {
    // RFC 6749 section 2.3.1: form-urlencode id/secret before base64 (clientId ends in "==").
    const user = encodeURIComponent(clientId);
    const pass = encodeURIComponent(clientSecret);
    const basic = Buffer.from(`${user}:${pass}`, "utf8").toString("base64");
    headers.Authorization = `Basic ${basic}`;
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers,
    body: body.toString(),
  });

  const data = await parseTokenResponse(res);

  if (!res.ok) {
    logTokenExchangeFailure(grantType, res, data, {
      authMethod,
      redirectUri: body.get("redirect_uri") ?? null,
      clientIdLength: clientId.length,
      clientSecretLength: clientSecret.length,
      ...meta,
    });
  } else {
    console.info(
      `${LOG_PREFIX} token exchange ok:`,
      JSON.stringify({
        grantType,
        authMethod,
        httpStatus: res.status,
        hasAccessToken: Boolean(data.access_token),
        hasRefreshToken: Boolean(data.refresh_token),
        expiresIn: data.expires_in ?? null,
        scope: data.scope ?? null,
      }),
    );
  }

  return { res, data };
}

function isInvalidClient(data: RevenueCatTokenResponse): boolean {
  return data.error === "invalid_client";
}

async function postRevenueCatTokenWithFallback(
  body: URLSearchParams,
  clientId: string,
  clientSecret: string,
  grantType: string,
  meta: Record<string, unknown> = {},
): Promise<{ res: Response; data: RevenueCatTokenResponse }> {
  // RevenueCat's OAuth server authenticates confidential clients via HTTP Basic,
  // so try client_secret_basic first and fall back to client_secret_post.
  const basicBody = new URLSearchParams(body);
  basicBody.delete("client_id");
  basicBody.delete("client_secret");

  const basicAttempt = await postRevenueCatToken(
    basicBody,
    clientId,
    clientSecret,
    grantType,
    "client_secret_basic",
    meta,
  );

  if (basicAttempt.res.ok || !isInvalidClient(basicAttempt.data)) {
    return basicAttempt;
  }

  console.warn(
    `${LOG_PREFIX} client_secret_basic rejected with invalid_client; retrying client_secret_post`,
  );

  return postRevenueCatToken(
    new URLSearchParams(body),
    clientId,
    clientSecret,
    grantType,
    "client_secret_post",
    meta,
  );
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
      "RevenueCat rejected client credentials at token exchange.",
      "Compare Heroku clientSecretFingerprint in logs with your RC secret (first 4 + last 4 chars).",
      "If they differ, re-paste REVENUE_CAT_CLIENT_SECRET on Heroku or ask support@revenuecat.com to rotate the secret.",
      `RC: ${raw}`,
    ].join(" ");
  }

  return raw;
}

export async function exchangeRevenueCatAuthorizationCode(params: {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
  logMeta?: Record<string, unknown>;
}): Promise<RevenueCatTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: params.redirectUri,
  });

  const { res, data } = await postRevenueCatTokenWithFallback(
    body,
    params.clientId,
    params.clientSecret,
    "authorization_code",
    {
      codeLength: params.code.length,
      ...params.logMeta,
    },
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

  const { res, data } = await postRevenueCatTokenWithFallback(
    body,
    params.clientId,
    params.clientSecret,
    "refresh_token",
    { refreshTokenLength: params.refreshToken.length },
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
    console.error(
      `${LOG_PREFIX} API GET failed:`,
      JSON.stringify({ path, httpStatus: res.status, message }),
    );
    throw new Error(message);
  }

  if (!text) return {} as T;
  return JSON.parse(text) as T;
}
