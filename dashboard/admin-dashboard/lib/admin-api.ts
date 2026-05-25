function getApiBase(): string {
  const raw =
    process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5001/api";
  return raw.replace(/\/$/, "");
}

export type AdminSession = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type ListingFeedResponse = {
  items: Record<string, unknown>[];
  total: number;
  page: number;
  limit: number;
};

async function parseJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { message: text || "Invalid response" };
  }
}

/** Set from AdminAuthProvider so API calls can refresh + retry without re-login. */
type TokenHandlers = {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  setTokens: (t: { accessToken: string; refreshToken: string }) => void;
};

let tokenHandlers: TokenHandlers | null = null;
let refreshInFlight: Promise<string> | null = null;

export function configureAdminAuth(handlers: TokenHandlers) {
  tokenHandlers = handlers;
}

export function clearAdminAuthConfig() {
  tokenHandlers = null;
}

async function refreshAccessToken(): Promise<string> {
  if (refreshInFlight) return refreshInFlight;

  const rt = tokenHandlers?.getRefreshToken() ?? null;
  if (!rt) {
    throw new Error("Session expired - sign in again.");
  }

  refreshInFlight = (async () => {
    const res = await fetch(`${getApiBase()}/admin/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: rt }),
    });
    const data = await parseJson(res);
    if (!res.ok) {
      throw new Error(
        typeof data.message === "string" ? data.message : "Could not refresh",
      );
    }
    const accessToken = data.accessToken as string;
    const refreshToken = data.refreshToken as string;
    tokenHandlers?.setTokens({ accessToken, refreshToken });
    return accessToken;
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

/** One automatic refresh + retry when access token is expired. */
async function fetchWithAdminAuth(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const h = tokenHandlers?.getAccessToken;
  if (!h) throw new Error("Admin auth not configured");
  let access = h();
  if (!access) throw new Error("Not signed in");

  const withBearer = (token: string) => {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return fetch(url, { ...init, headers });
  };

  let res = await withBearer(access);
  if (res.status !== 401) return res;

  let body: { code?: string } = {};
  try {
    body = (await res.clone().json()) as { code?: string };
  } catch {
    // ignore
  }
  if (body.code !== "EXPIRED_TOKEN") return res;

  access = await refreshAccessToken();
  return withBearer(access);
}

export async function adminLogin(email: string, password: string) {
  const res = await fetch(`${getApiBase()}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Login failed",
    );
  }
  return data as {
    admin: AdminSession;
    accessToken: string;
    refreshToken: string;
  };
}

export async function adminLogout(refreshToken: string | null) {
  await fetch(`${getApiBase()}/admin/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: refreshToken ?? "" }),
  });
}

export async function fetchPendingListings(
  params?: { page?: number; limit?: number },
): Promise<ListingFeedResponse> {
  const q = new URLSearchParams();
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  const url = `${getApiBase()}/admin/listings/pending${qs ? `?${qs}` : ""}`;
  const res = await fetchWithAdminAuth(url);
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Request failed",
    );
  }
  return data as ListingFeedResponse;
}

export type ListingReviewAction = "approve" | "reject" | "unpublish";

export async function patchListingReview(
  listingId: string,
  action: ListingReviewAction,
  options?: { rejectionReason?: string },
): Promise<{ ok: boolean }> {
  const url = `${getApiBase()}/admin/listings/${encodeURIComponent(listingId)}/review`;
  const res = await fetchWithAdminAuth(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action,
      ...(options?.rejectionReason
        ? { rejectionReason: options.rejectionReason }
        : {}),
    }),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Update failed",
    );
  }
  return data as { ok: boolean };
}

export async function fetchActiveListings(
  params?: { page?: number; limit?: number },
): Promise<ListingFeedResponse> {
  const q = new URLSearchParams();
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  const url = `${getApiBase()}/admin/listings/active${qs ? `?${qs}` : ""}`;
  const res = await fetchWithAdminAuth(url);
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Request failed",
    );
  }
  return data as ListingFeedResponse;
}
