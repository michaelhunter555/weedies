import type { AdminListingReviewContext } from "./admin-listing-types";

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

export async function uploadPlatformListingPhotos(
  files: File[],
): Promise<string[]> {
  const fd = new FormData();
  files.forEach((file) => fd.append("photos", file));
  const url = `${getApiBase()}/admin/platform-listings/upload-photos`;
  const res = await fetchWithAdminAuth(url, { method: "POST", body: fd });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Photo upload failed",
    );
  }
  return (data.urls as string[]) ?? [];
}

export type CreatePlatformListingPayload = Record<string, unknown>;

export async function createPlatformListing(
  payload: CreatePlatformListingPayload,
): Promise<{ ok: boolean; listing: Record<string, unknown> }> {
  const url = `${getApiBase()}/admin/platform-listings`;
  const res = await fetchWithAdminAuth(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Create failed",
    );
  }
  return data as { ok: boolean; listing: Record<string, unknown> };
}

export async function updatePlatformListing(
  listingId: string,
  payload: CreatePlatformListingPayload,
): Promise<{ ok: boolean; listing: Record<string, unknown> }> {
  const url = `${getApiBase()}/admin/platform-listings/${encodeURIComponent(listingId)}`;
  const res = await fetchWithAdminAuth(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Update failed",
    );
  }
  return data as { ok: boolean; listing: Record<string, unknown> };
}

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

export async function fetchAdminListingById(
  listingId: string,
): Promise<{
  ok: boolean;
  listing: Record<string, unknown>;
  reviewContext?: AdminListingReviewContext;
}> {
  const url = `${getApiBase()}/admin/listings/${encodeURIComponent(listingId)}`;
  const res = await fetchWithAdminAuth(url);
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Request failed",
    );
  }
  return data as {
    ok: boolean;
    listing: Record<string, unknown>;
    reviewContext?: AdminListingReviewContext;
  };
}

export type AdminDisputeRow = {
  id: string;
  listingId: string;
  listingAppName: string;
  category: string;
  disputeStatus: string;
  initiatorName: string;
  amountPaid: number;
  requestedRefundAmount: number;
  desiredAction?: string;
  disputeDate: string;
  createdAt?: string;
};

export type DisputesFeedResponse = {
  ok: boolean;
  items: AdminDisputeRow[];
  total: number;
  page: number;
  limit: number;
};

export async function fetchAdminDisputes(params?: {
  page?: number;
  limit?: number;
  status?: string;
  q?: string;
}): Promise<DisputesFeedResponse> {
  const q = new URLSearchParams();
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.status) q.set("status", params.status);
  if (params?.q) q.set("q", params.q);
  const qs = q.toString();
  const url = `${getApiBase()}/admin/disputes${qs ? `?${qs}` : ""}`;
  const res = await fetchWithAdminAuth(url);
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Request failed",
    );
  }
  return data as DisputesFeedResponse;
}

export type AdminDisputeDetail = {
  ok: boolean;
  dispute: Record<string, unknown>;
  listing: {
    id: string;
    appName: string;
    slug: string;
    status: string;
    photos: string[];
    coverIndex: number;
    saleType: string;
  } | null;
  buyer: { id: string; name: string; email: string } | null;
  seller: { id: string; name: string; email: string } | null;
};

export async function fetchAdminDisputeById(
  disputeId: string,
): Promise<AdminDisputeDetail> {
  const url = `${getApiBase()}/admin/disputes/${encodeURIComponent(disputeId)}`;
  const res = await fetchWithAdminAuth(url);
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Request failed",
    );
  }
  return data as AdminDisputeDetail;
}

export type AdminDisputeDecision = "in_favor_user" | "in_favor_seller";

export type AdminTransactionRow = {
  id: string;
  listingId: string;
  listingAppName: string;
  listingSlug: string;
  listingStatus: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  sellerId: string;
  sellerName: string;
  sellerEmail: string;
  amountCharged: number;
  amountPaid: number;
  serviceFee: number;
  paymentStatus: string;
  billingReason: string;
  hasDispute: boolean;
  paidOut: boolean;
  payoutDate: string | null;
  paymentType: string;
  stripePaymentIntentId: string;
  escrowTransactionId: string;
  escrowFundsSecured: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type TransactionsFeedResponse = {
  ok: boolean;
  items: AdminTransactionRow[];
  total: number;
  page: number;
  limit: number;
  summary: {
    totalSales: number;
    totalServiceFee: number;
    transactionCount: number;
  };
};

export type AdminTransactionsQuery = {
  page?: number;
  limit?: number;
  id?: string;
  status?: string;
  paymentType?: string;
  hasDispute?: boolean;
  paidOut?: boolean;
  days?: 7 | 14 | 30;
};

export async function fetchAdminTransactions(
  params?: AdminTransactionsQuery,
): Promise<TransactionsFeedResponse> {
  const q = new URLSearchParams();
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.id) q.set("id", params.id);
  if (params?.status) q.set("status", params.status);
  if (params?.paymentType) q.set("paymentType", params.paymentType);
  if (params?.hasDispute === true) q.set("hasDispute", "true");
  if (params?.hasDispute === false) q.set("hasDispute", "false");
  if (params?.paidOut === true) q.set("paidOut", "true");
  if (params?.paidOut === false) q.set("paidOut", "false");
  if (params?.days) q.set("days", String(params.days));
  const qs = q.toString();
  const url = `${getApiBase()}/admin/transactions${qs ? `?${qs}` : ""}`;
  const res = await fetchWithAdminAuth(url);
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Request failed",
    );
  }
  return data as TransactionsFeedResponse;
}

export async function patchAdminDisputeDecision(
  disputeId: string,
  body: {
    decision: AdminDisputeDecision;
    platformResponse: string;
    /** Whole-dollar refund in cents when resolving for the buyer. */
    refundAmountCents?: number;
  },
): Promise<{ ok: boolean; message?: string }> {
  const url = `${getApiBase()}/admin/disputes/${encodeURIComponent(disputeId)}/decision`;
  const res = await fetchWithAdminAuth(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Decision failed",
    );
  }
  return data as { ok: boolean; message?: string };
}

export type AdminChatListingSummary = {
  id: string;
  appName: string;
  slug?: string;
  productPath: string;
};

export type AdminChatRow = {
  _id: string;
  lastMessage?: string;
  lastMessageTime?: string;
  updatedAt?: string;
  listing?: AdminChatListingSummary | null;
  viewerCounterpart: {
    id: string | null;
    displayName: string;
    image: string;
    masked: boolean;
  };
  unreadCount?: number;
};

export type AdminChatsResponse = {
  ok?: boolean;
  chats: AdminChatRow[];
  page: number;
  totalPages: number;
  totalChats: number;
  limit: number;
  activeChatCount?: number;
  maxActiveChats?: number;
};

export type AdminChatMessageRow = {
  _id: string;
  text: string;
  read: boolean;
  createdAt?: string;
  fromMe: boolean;
  senderLabel: string;
  isSystem?: boolean;
};

export type AdminChatMessagesResponse = {
  ok?: boolean;
  chatPreview?: AdminChatRow;
  chatMessages: AdminChatMessageRow[];
  otherParticipantLeft?: boolean;
};

export type AdminUnreadCountResponse = {
  ok?: boolean;
  unreadCount: number;
  unreadByChat: Record<string, number>;
};

export async function fetchAdminChats(params?: {
  page?: number;
  limit?: number;
}): Promise<AdminChatsResponse> {
  const q = new URLSearchParams();
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  const url = `${getApiBase()}/admin/chats/mine${qs ? `?${qs}` : ""}`;
  const res = await fetchWithAdminAuth(url);
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Could not load messages",
    );
  }
  return data as AdminChatsResponse;
}

export async function fetchAdminChatUnreadCount(): Promise<AdminUnreadCountResponse> {
  const url = `${getApiBase()}/admin/chats/unread-count`;
  const res = await fetchWithAdminAuth(url);
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Could not load unread count",
    );
  }
  return data as AdminUnreadCountResponse;
}

export async function fetchAdminChatMessages(
  chatId: string,
): Promise<AdminChatMessagesResponse> {
  const url = `${getApiBase()}/admin/chats/${encodeURIComponent(chatId)}/messages?page=1&limit=100`;
  const res = await fetchWithAdminAuth(url);
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Could not load thread",
    );
  }
  return data as AdminChatMessagesResponse;
}

export async function sendAdminChatMessage(
  chatId: string,
  text: string,
): Promise<{ ok?: boolean }> {
  const url = `${getApiBase()}/admin/chats/${encodeURIComponent(chatId)}/messages`;
  const res = await fetchWithAdminAuth(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Could not send message",
    );
  }
  return data as { ok?: boolean };
}

export async function closeAdminChat(chatId: string): Promise<{ ok?: boolean }> {
  const url = `${getApiBase()}/admin/chats/${encodeURIComponent(chatId)}`;
  const res = await fetchWithAdminAuth(url, { method: "DELETE" });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Could not close chat",
    );
  }
  return data as { ok?: boolean };
}
