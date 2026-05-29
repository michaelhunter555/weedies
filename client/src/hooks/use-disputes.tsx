"use client";

import { useCallback } from "react";

import { useApiFetchOrThrow } from "@/hooks/use-api-fetch";
import type {
  DisputeDetailResponse,
  DisputeRecord,
  DisputesListResponse,
} from "../../types";

export function useDisputes() {
  const { apiFetch } = useApiFetchOrThrow();

  const listDisputes = useCallback(
    async (params: {
      userId: string;
      page?: number;
      limit?: number;
      status?: string;
      queryValue?: string;
    }): Promise<DisputesListResponse> => {
      const q = new URLSearchParams();
      q.set("userId", params.userId);
      q.set("page", String(params.page ?? 1));
      q.set("limit", String(params.limit ?? 12));
      if (params.status) q.set("status", params.status);
      if (params.queryValue) q.set("queryValue", params.queryValue);
      return apiFetch<DisputesListResponse>(`/disputes?${q.toString()}`, "GET");
    },
    [apiFetch],
  );

  const getDispute = useCallback(
    async (disputeId: string): Promise<DisputeDetailResponse> =>
      apiFetch<DisputeDetailResponse>(
        `/disputes/${encodeURIComponent(disputeId)}`,
        "GET",
      ),
    [apiFetch],
  );

  const createDispute = useCallback(
    async (form: FormData): Promise<{ dispute: DisputeRecord; disputeId: string }> => {
      const res = await apiFetch<{
        ok?: boolean;
        dispute: DisputeRecord;
        disputeId: string;
      }>("/disputes", "POST", form);
      return { dispute: res.dispute, disputeId: res.disputeId };
    },
    [apiFetch],
  );

  const respondToDispute = useCallback(
    async (
      disputeId: string,
      body: { action: "accept" | "escalate"; sellerResponse?: string },
    ): Promise<DisputeRecord> => {
      const res = await apiFetch<{ ok?: boolean; dispute: DisputeRecord }>(
        `/disputes/${encodeURIComponent(disputeId)}/respond`,
        "POST",
        body,
      );
      return res.dispute;
    },
    [apiFetch],
  );

  return { listDisputes, getDispute, createDispute, respondToDispute };
}
