"use client";

import { useCallback } from "react";

import { useApiFetchOrThrow } from "@/hooks/use-api-fetch";
import type {
  OwnershipVerificationCheckMethod,
  OwnershipVerificationCheckResponse,
  OwnershipVerificationPayload,
} from "@/lib/ownership-verification";

export function useOwnershipVerification() {
  const { apiFetch } = useApiFetchOrThrow();

  const fetchOwnershipVerification = useCallback(
    async (listingId: string) =>
      apiFetch<OwnershipVerificationPayload>(
        `/listings/${encodeURIComponent(listingId)}/ownership-verification`,
        "GET",
      ),
    [apiFetch],
  );

  const checkOwnershipVerification = useCallback(
    async (listingId: string, method: OwnershipVerificationCheckMethod = "well_known") =>
      apiFetch<OwnershipVerificationCheckResponse>(
        `/listings/${encodeURIComponent(listingId)}/ownership-verification/check`,
        "POST",
        { method },
      ),
    [apiFetch],
  );

  return { fetchOwnershipVerification, checkOwnershipVerification };
}
