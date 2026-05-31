"use client";

import { useCallback } from "react";

import { useApiFetchOrThrow } from "@/hooks/use-api-fetch";
import type {
  GaListingMetricsSnapshot,
  Listing,
  ListingCategory,
  ListingExchangeBuyerReview,
  ListingExchangePayload,
  MarketplaceOrderRow,
  MyAuctionBidRow,
  MyListingsPayload,
  MyMarketplaceOrdersPayload,
  MyTransactionHistoryPayload,
  Paginated,
  SellerListingEditMeta,
} from "../../types";

export type MyListingsParams = {
  page?: number;
  limit?: number;
  status?: "active" | "sold" | "expired" | "all";
};

export type MyMarketplaceOrdersParams = {
  purchasePage?: number;
  salePage?: number;
  limit?: number;
};

export type MyTransactionsParams = {
  page?: number;
  limit?: number;
};

export type ListingFeedParams = {
  category?: ListingCategory | string;
  difficulty?: string;
  turnaround?: string;
  saleType?: string;
  q?: string;
  page?: number;
  limit?: number;
};

export type ListingFeed = {
  items: Listing[];
  total: number;
  page: number;
  limit: number;
};

const EMPTY_MY_LISTINGS_META = {
  totalActive: 0,
  totalSold: 0,
  totalExpired: 0,
  pendingPrivateAccessTotal: 0,
} as const;

function normalizeMyListingsPayload(
  raw: MyListingsPayload | Listing[] | null | undefined,
  params: MyListingsParams,
): MyListingsPayload {
  const limit = params.limit ?? 20;
  const page = params.page ?? 1;
  const empty: MyListingsPayload = {
    items: [],
    page: 1,
    limit,
    total: 0,
    totalPages: 1,
    meta: { ...EMPTY_MY_LISTINGS_META },
  };
  if (!raw) return empty;

  if (Array.isArray(raw)) {
    const totalActive = raw.filter(
      (l) => l.status !== "sold" && l.status !== "removed",
    ).length;
    const totalSold = raw.filter((l) => l.status === "sold").length;
    const totalExpired = raw.filter((l) => l.status === "expired").length;
    const status = params.status ?? "active";
    const pool =
      status === "sold"
        ? raw.filter((l) => l.status === "sold")
        : status === "all"
          ? raw
          : raw.filter((l) => l.status !== "sold" && l.status !== "removed");
    const total = pool.length;
    return {
      items: pool.slice((page - 1) * limit, page * limit),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit) || 1),
      meta: { totalActive, totalSold, totalExpired, pendingPrivateAccessTotal: 0 },
    };
  }

  return {
    ...empty,
    ...raw,
    items: raw.items ?? [],
    page: raw.page ?? page,
    limit: raw.limit ?? limit,
    total: raw.total ?? 0,
    totalPages: raw.totalPages ?? 1,
    meta: raw.meta ?? { ...EMPTY_MY_LISTINGS_META },
  };
}

/** Pre-pagination API returned `purchases` / `sales` as bare arrays. */
type LegacyMarketplaceOrdersPayload = {
  purchases?: MarketplaceOrderRow[] | Paginated<MarketplaceOrderRow>;
  sales?: MarketplaceOrderRow[] | Paginated<MarketplaceOrderRow>;
};

function normalizeOrderSide(
  raw: MarketplaceOrderRow[] | Paginated<MarketplaceOrderRow> | null | undefined,
  page: number,
  limit: number,
): Paginated<MarketplaceOrderRow> {
  const empty: Paginated<MarketplaceOrderRow> = {
    items: [],
    page,
    limit,
    total: 0,
    totalPages: 1,
  };
  if (!raw) return empty;

  if (Array.isArray(raw)) {
    const total = raw.length;
    return {
      items: raw.slice((page - 1) * limit, page * limit),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit) || 1),
    };
  }

  const items = raw.items ?? [];
  const total = typeof raw.total === "number" ? raw.total : items.length;
  return {
    items,
    page: raw.page ?? page,
    limit: raw.limit ?? limit,
    total,
    totalPages:
      raw.totalPages ?? Math.max(1, Math.ceil(total / (raw.limit ?? limit)) || 1),
  };
}

function normalizeMarketplaceOrdersPayload(
  raw: LegacyMarketplaceOrdersPayload | null | undefined,
  params: MyMarketplaceOrdersParams,
): MyMarketplaceOrdersPayload {
  const limit = params.limit ?? 20;
  const purchasePage = params.purchasePage ?? 1;
  const salePage = params.salePage ?? 1;

  if (!raw) {
    return {
      purchases: normalizeOrderSide(undefined, purchasePage, limit),
      sales: normalizeOrderSide(undefined, salePage, limit),
    };
  }

  return {
    purchases: normalizeOrderSide(raw.purchases, purchasePage, limit),
    sales: normalizeOrderSide(raw.sales, salePage, limit),
  };
}

export const useListings = () => {
  const { apiFetch } = useApiFetchOrThrow();

  /** Paginated listings owned by the authenticated seller. */
  const getMyListings = useCallback(
    async (params: MyListingsParams = {}): Promise<MyListingsPayload> => {
      const qs = new URLSearchParams();
      if (params.page) qs.set("page", String(params.page));
      if (params.limit) qs.set("limit", String(params.limit));
      if (params.status) qs.set("status", params.status);
      const path = qs.toString() ? `/listings/me/mine?${qs}` : "/listings/me/mine";
      const data = await apiFetch<MyListingsPayload | Listing[]>(path, "GET");
      return normalizeMyListingsPayload(data, params);
    },
    [apiFetch],
  );

  /** Buy-it-now purchases (as buyer) and sales (as seller) with listing metadata. */
  const getMyMarketplaceOrders = useCallback(
    async (params: MyMarketplaceOrdersParams = {}): Promise<MyMarketplaceOrdersPayload> => {
      const qs = new URLSearchParams();
      if (params.purchasePage) qs.set("purchasePage", String(params.purchasePage));
      if (params.salePage) qs.set("salePage", String(params.salePage));
      if (params.limit) qs.set("limit", String(params.limit));
      const path = qs.toString()
        ? `/listings/me/marketplace-orders?${qs}`
        : "/listings/me/marketplace-orders";
      const data = await apiFetch<LegacyMarketplaceOrdersPayload>(path, "GET");
      return normalizeMarketplaceOrdersPayload(data, params);
    },
    [apiFetch],
  );

  /** Full transaction ledger (buyer or seller on any charge). */
  const getMyTransactions = useCallback(
    async (params: MyTransactionsParams = {}): Promise<MyTransactionHistoryPayload> => {
      const qs = new URLSearchParams();
      if (params.page) qs.set("page", String(params.page));
      if (params.limit) qs.set("limit", String(params.limit));
      const path = qs.toString()
        ? `/listings/me/transactions?${qs}`
        : "/listings/me/transactions";
      const data = await apiFetch<MyTransactionHistoryPayload>(path, "GET");
      return (
        data ?? {
          items: [],
          page: 1,
          limit: 25,
          total: 0,
          totalPages: 1,
        }
      );
    },
    [apiFetch],
  );

  /** Auction listings the current user has placed at least one bid on. */
  const getMyAuctionBids = useCallback(async (): Promise<MyAuctionBidRow[]> => {
    const data = await apiFetch<MyAuctionBidRow[]>("/listings/me/auction-bids", "GET");
    return data ?? [];
  }, [apiFetch]);

  /**
   * Public marketplace feed. Unauthenticated - returns only `live` listings.
   * Supports category / text search / pagination via query params.
   */
  const getAllListings = useCallback(
    async (params: ListingFeedParams = {}): Promise<ListingFeed> => {
      const qs = new URLSearchParams();
      if (params.category) qs.set("category", String(params.category));
      if (params.difficulty) qs.set("difficulty", params.difficulty);
      if (params.turnaround) qs.set("turnaround", params.turnaround);
      if (params.saleType) qs.set("saleType", params.saleType);
      if (params.q) qs.set("q", params.q);
      if (params.page) qs.set("page", String(params.page));
      if (params.limit) qs.set("limit", String(params.limit));

      const path = qs.toString()
        ? `/listings?${qs.toString()}`
        : `/listings`;
      const data = await apiFetch<ListingFeed>(path, "GET");
      return (
        data ?? {
          items: [],
          total: 0,
          page: params.page ?? 1,
          limit: params.limit ?? 24,
        }
      );
    },
    [apiFetch],
  );

  /**
   * Upload 1..6 screenshots to Cloudinary via our backend. Returns the
   * hosted URLs in the same order they were submitted.
   */
  const uploadPhotos = useCallback(
    async (files: File[]): Promise<string[]> => {
      if (!files.length) return [];
      const form = new FormData();
      files.forEach((f) => form.append("photos", f));
      const data = await apiFetch<{ urls?: string[] }>(
        "/listings/upload-photos",
        "POST",
        form,
      );
      return data?.urls ?? [];
    },
    [apiFetch],
  );

  /** Create a new listing owned by the authenticated seller. */
  const createListing = useCallback(
    async (
      payload: Partial<Listing> & { existingDraftId?: string },
    ): Promise<Listing> => apiFetch<Listing>("/listings", "POST", payload),
    [apiFetch],
  );

  /** Save or update a draft without listing fees (see POST /listings/draft). */
  const saveDraft = useCallback(
    async (
      payload: Partial<Listing> & {
        draftListingId?: string;
        isBuyItNow?: boolean;
      },
    ): Promise<Listing> => apiFetch<Listing>("/listings/draft", "POST", payload),
    [apiFetch],
  );

  /** Seller PATCH for an existing listing (subject to edit-eligibility on the server). */
  const updateListing = useCallback(
    async (id: string, payload: Partial<Listing>): Promise<Listing> =>
      apiFetch<Listing>(
        `/listings/${encodeURIComponent(id)}`,
        "PATCH",
        payload,
      ),
    [apiFetch],
  );

  /** Seller soft-delete: sets listing `status` to `removed`. */
  const deleteListing = useCallback(
    async (id: string): Promise<{ success?: boolean; id?: string }> =>
      apiFetch<{ success?: boolean; id?: string }>(
        `/listings/${encodeURIComponent(id)}`,
        "DELETE",
      ),
    [apiFetch],
  );

  /** Whether the authenticated seller may edit listing fields for this id. */
  const getSellerListingEditMeta = useCallback(
    async (listingId: string): Promise<SellerListingEditMeta> =>
      apiFetch<SellerListingEditMeta>(
        `/listings/me/edit-meta?listingId=${encodeURIComponent(listingId)}`,
        "GET",
      ),
    [apiFetch],
  );

  /** Public single listing by Mongo `_id` or `slug`. */
  const getListing = useCallback(
    async (idOrSlug: string): Promise<Listing> =>
      apiFetch<Listing>(`/listings/${encodeURIComponent(idOrSlug)}`, "GET"),
    [apiFetch],
  );

  /** Request seller approval for a private listing. */
  const requestPrivateListingAccess = useCallback(
    async (
      listingId: string,
      body?: { message?: string },
    ): Promise<{ status: "pending" | "approved"; requestId?: string; message?: string }> =>
      apiFetch(
        `/listings/${encodeURIComponent(listingId)}/private-access/request`,
        "POST",
        body ?? {},
      ),
    [apiFetch],
  );

  /** Seller: approve or deny a pending private listing access request. */
  const resolvePrivateListingAccess = useCallback(
    async (
      listingId: string,
      requestId: string,
      decision: "approve" | "deny",
    ): Promise<{
      success?: boolean;
      requestId?: string;
      status?: "approved" | "denied";
      requesterId?: string;
    }> =>
      apiFetch(
        `/listings/${encodeURIComponent(listingId)}/private-access/${encodeURIComponent(requestId)}`,
        "PATCH",
        { decision },
      ),
    [apiFetch],
  );

  /**
   * GA4 snapshot (last 30 days) for a listing with a linked property.
   * Works for live listings anonymously; for draft/pending, the seller must be
   * signed in (owner check on the server).
   */
  const getListingGoogleAnalyticsMetrics = useCallback(
    async (listingId: string): Promise<GaListingMetricsSnapshot> =>
      apiFetch<GaListingMetricsSnapshot>(
        `/listings/${encodeURIComponent(listingId)}/google-analytics/metrics`,
        "GET",
      ),
    [apiFetch],
  );

  /** Start a 1:1 thread with optional listing context (seller privacy masking). */
  const createChat = useCallback(
    async (body: {
      recipientId: string;
      message: string;
      listingId?: string;
    }): Promise<{ chat?: { _id?: string } }> =>
      apiFetch<{ chat?: { _id?: string } }>("/chats", "POST", body),
    [apiFetch],
  );

  /** Record an auction bid (no charge). Requires auth. */
  const placeAuctionBid = useCallback(
    async (listingId: string, amountDollars: number): Promise<Listing> =>
      apiFetch<Listing>(
        `/listings/${encodeURIComponent(listingId)}/bids`,
        "POST",
        { amount: amountDollars },
      ),
    [apiFetch],
  );

  /** Seller: accept or reject a pending auction bid. */
  const setAuctionBidStatus = useCallback(
    async (
      listingId: string,
      bidId: string,
      status: "accepted" | "rejected",
    ): Promise<Listing> =>
      apiFetch<Listing>(
        `/listings/${encodeURIComponent(listingId)}/bids/${encodeURIComponent(bidId)}`,
        "PATCH",
        { status },
      ),
    [apiFetch],
  );

  /** Buyer or seller: post-sale exchange state for a sold listing. */
  const getListingExchange = useCallback(
    async (listingId: string): Promise<ListingExchangePayload> =>
      apiFetch<ListingExchangePayload>(
        `/listings/exchange/${encodeURIComponent(listingId)}`,
        "GET",
      ),
    [apiFetch],
  );

  /** Seller: upload branding / NDA–style files (multipart `files`). */
  const uploadExchangeDeliverables = useCallback(
    async (
      listingId: string,
      files: File[],
    ): Promise<{ deliverables: ListingExchangePayload["exchange"]["deliverables"] }> => {
      const form = new FormData();
      files.forEach((f) => form.append("files", f));
      return apiFetch(
        `/listings/exchange/${encodeURIComponent(listingId)}/deliverables`,
        "POST",
        form,
      );
    },
    [apiFetch],
  );

  /** Buyer: confirm receipt after deliverables are attached. */
  const confirmListingExchange = useCallback(
    async (listingId: string): Promise<{ buyerConfirmedAt: string }> =>
      apiFetch<{ buyerConfirmedAt: string }>(
        `/listings/exchange/${encodeURIComponent(listingId)}/confirm`,
        "POST",
      ),
    [apiFetch],
  );

  /** Buyer: optional post-handover review (stars and/or note), once per sale. */
  const submitExchangeReview = useCallback(
    async (
      listingId: string,
      body: { rating?: number | null; comment?: string },
    ): Promise<{ buyerReview: ListingExchangeBuyerReview }> =>
      apiFetch<{ buyerReview: ListingExchangeBuyerReview }>(
        `/listings/exchange/${encodeURIComponent(listingId)}/review`,
        "POST",
        body,
      ),
    [apiFetch],
  );

  const relistListing = useCallback(
    async (listingId: string): Promise<{ ok?: boolean; message?: string }> =>
      apiFetch<{ ok?: boolean; message?: string }>(
        `/listings/${encodeURIComponent(listingId)}/relist`,
        "POST",
      ),
    [apiFetch],
  );

  return {
    getMyListings,
    relistListing,
    getMyMarketplaceOrders,
    getMyTransactions,
    getMyAuctionBids,
    getAllListings,
    uploadPhotos,
    createListing,
    saveDraft,
    updateListing,
    deleteListing,
    createChat,
    getSellerListingEditMeta,
    getListing,
    requestPrivateListingAccess,
    resolvePrivateListingAccess,
    getListingGoogleAnalyticsMetrics,
    placeAuctionBid,
    setAuctionBidStatus,
    getListingExchange,
    uploadExchangeDeliverables,
    confirmListingExchange,
    submitExchangeReview,
  };
};
