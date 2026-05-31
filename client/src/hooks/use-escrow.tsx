"use client";

import { useCallback } from "react";

import { useApiFetchOrThrow } from "@/hooks/use-api-fetch";

export type InitEscrowTransactionResponse = {
  ok: boolean;
  escrowTransactionId: string;
  transactionId: string;
  continueViaEmail: boolean;
  message: string;
  reused?: boolean;
};

export type EscrowPartyStatus = {
  email: string;
  agreed: boolean;
  role: string;
};

export type EscrowTransactionStatusResponse = {
  ok: boolean;
  escrowTransactionId: string;
  listingId: string;
  paymentStatus: string;
  escrowLastEvent?: string | null;
  escrowLastEventAt?: string | null;
  escrowFundsSecured?: boolean;
  escrowEvents?: { event: string; at: string }[];
  itemShipped?: boolean;
  itemReceived?: boolean;
  itemAccepted?: boolean;
  is_cancelled: boolean;
  close_date: string | null;
  creation_date: string | null;
  fundsSecured: boolean;
  canCancel: boolean;
  buyer: EscrowPartyStatus | null;
  seller: EscrowPartyStatus | null;
};

export type CancelEscrowTransactionResponse = {
  ok: boolean;
  escrowTransactionId: string;
  is_cancelled: boolean;
  paymentStatus: string;
  listingId: string;
};

export const useEscrow = () => {
  const { apiFetch } = useApiFetchOrThrow();

  const initEscrowTransaction = useCallback(
    async (listingId: string): Promise<InitEscrowTransactionResponse> => {
      const data = await apiFetch<InitEscrowTransactionResponse>(
        "/escrow/transaction",
        "POST",
        { listingId },
      );
      if (!data?.ok || !data.escrowTransactionId) {
        throw new Error("Escrow did not start checkout.");
      }
      return data;
    },
    [apiFetch],
  );

  const getEscrowTransactionStatus = useCallback(
    async (escrowTransactionId: string): Promise<EscrowTransactionStatusResponse> => {
      const data = await apiFetch<EscrowTransactionStatusResponse>(
        `/escrow/transaction/${encodeURIComponent(escrowTransactionId)}`,
        "GET",
      );
      if (!data?.ok) {
        throw new Error("Could not load Escrow transaction status.");
      }
      return data;
    },
    [apiFetch],
  );

  const cancelEscrowTransaction = useCallback(
    async (
      escrowTransactionId: string,
      cancellationReason?: string,
    ): Promise<CancelEscrowTransactionResponse> => {
      const data = await apiFetch<CancelEscrowTransactionResponse>(
        "/escrow/transaction/cancel",
        "POST",
        { escrowTransactionId, cancellationReason },
      );
      if (!data?.ok) {
        throw new Error("Could not cancel Escrow transaction.");
      }
      return data;
    },
    [apiFetch],
  );

  return {
    initEscrowTransaction,
    getEscrowTransactionStatus,
    cancelEscrowTransaction,
  };
};
