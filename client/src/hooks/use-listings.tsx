"use client";

import { useCallback } from "react";

import { useApiFetchOrThrow } from "@/hooks/use-api-fetch";
import type { Listing, ListingCategory } from "../../types";

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

export const useListings = () => {
  const { apiFetch } = useApiFetchOrThrow();

  /** All listings owned by the authenticated seller (any status). */
  const getMyListings = useCallback(async (): Promise<Listing[]> => {
    const data = await apiFetch<Listing[]>("/listings/me/mine", "GET");
    return data ?? [];
  }, [apiFetch]);

  /**
   * Public marketplace feed. Unauthenticated — returns only `live` listings.
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
    async (payload: Partial<Listing>): Promise<Listing> =>
      apiFetch<Listing>("/listings", "POST", payload),
    [apiFetch],
  );


  return { getMyListings, getAllListings, uploadPhotos, createListing };
};
