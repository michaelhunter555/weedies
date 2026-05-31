"use client";

import { useCallback } from "react";

import { useApiFetchOrThrow } from "@/hooks/use-api-fetch";
import type { BillingHistoryPayload } from "../../types";

/**
 * Thin client for the buyer-side Stripe endpoints that the wallet page
 * consumes. Backend routes live at `/api/stripe/*`.
 *
 * All requests funnel through `useApiFetch` so they pick up auto refresh-and-retry
 * on `EXPIRED_TOKEN`.
 */
export type StripePaymentMethod = {
  id: string;
  card: {
    brand: string;
    last4: string;
    exp_month: number | string;
    exp_year: number | string;
  };
};

export type PaymentMethodsResponse = {
  hasCard: boolean;
  /** Stripe customer `invoice_settings.default_payment_method`, if any. */
  defaultPaymentMethodId?: string | null;
  paymentMethods: { data: StripePaymentMethod[] };
};

export type SellerOnboardingStartResult = {
  url: string;
  stripeConnectAccountId: string;
  stripeAccountId: string;
};

export type BillingHistoryResponse = BillingHistoryPayload;

export type PayoutBatchListItem = {
  _id: string;
  status: "pending" | "paid" | "failed" | "canceled";
  amount: number;
  amountCents: number;
  currency: string;
  stripePayoutId: string | null;
  payoutDate: string | null;
  transactionCount: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type PayoutBatchesResponse = {
  ok?: boolean;
  items: PayoutBatchListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ConnectBalanceResponse = {
  ok?: boolean;
  connected: boolean;
  currency: string;
  /** Major units (e.g. dollars). */
  available: number;
  pending: number;
  reserved: number;
  instantAvailable: number;
  /** Stripe Connect available + pending (major units). */
  stripeConnectTotal?: number;
  /** Dashboard headline only: Stripe balance + funded Escrow seller net. */
  salesRevenueTotal?: number;
  /** Stripe Connect available + pending — use on Wallet payouts tab, not Escrow. */
  total?: number;
  escrow?: {
    secured: number;
    inProgress: number;
    securedSaleCount: number;
    inProgressSaleCount: number;
  };
  /** ISO timestamp — next Mon/Thu platform payout batch (UTC). */
  nextEstimatedPayoutAt?: string;
  isLikelyFirstPayout?: boolean;
  payoutTimingNote?: string;
  isOnboarded?: boolean;
};

export const useStripeWallet = () => {
  const { apiFetch } = useApiFetchOrThrow();

  /** List saved cards for a Stripe customer. */
  const getPaymentMethods = useCallback(
    async (stripeCustomerId: string): Promise<PaymentMethodsResponse> => {
      try {
        const data = await apiFetch<PaymentMethodsResponse>(
          `/stripe/payment-methods?stripeCustomerId=${encodeURIComponent(stripeCustomerId)}`,
          "GET",
        );
        return data;
      } catch (err) {
        console.error("Error getting payment methods", err);
        throw err;
      }
    },
    [apiFetch],
  );

  /** Creates a SetupIntent and returns its client_secret. */
  const createSetupIntent = useCallback(
    async (stripeCustomerId: string): Promise<string> => {
      const data = await apiFetch<{ clientSecret?: string }>(
        "/stripe/setup-intent",
        "POST",
        { customerId: stripeCustomerId },
      );
      return String(data?.clientSecret || "");
    },
    [apiFetch],
  );

  /** Marks a payment method as the customer's default. */
  const updateDefaultPayment = useCallback(
    async (stripeCustomerId: string, paymentMethodId: string) =>
      apiFetch("/stripe/default-payment-method", "POST", {
        customerId: stripeCustomerId,
        paymentMethodId,
      }),
    [apiFetch],
  );

  /** Detaches one or more payment methods from the customer. */
  const deletePaymentMethods = useCallback(
    async (paymentMethodIds: string[]) =>
      apiFetch("/stripe/delete-payment-methods", "POST", { paymentMethodIds }),
    [apiFetch],
  );

  /**
   * Starts (or resumes) Stripe Connect onboarding for the seller and returns
   * the redirect URL. If the user already has a connected account we just
   * refresh the onboarding link; otherwise we create the account + link.
   */
  const startSellerOnboarding = useCallback(
    async (opts: {
      hasExistingAccount: boolean;
      countryCode: string;
    }): Promise<SellerOnboardingStartResult> => {
      const path = opts.hasExistingAccount
        ? "/stripe/refreshed-onboarding-link"
        : "/stripe/create-connect-account";
      const method = opts.hasExistingAccount ? "GET" : "POST";

      const data = await apiFetch<{
        url?: string;
        stripeConnectAccountId?: string;
        stripeAccountId?: string;
      }>(
        `${path}?countryCode=${encodeURIComponent(opts.countryCode)}`,
        method,
      );
      const url = String(data?.url || "");
      const stripeConnectAccountId = String(
        data?.stripeConnectAccountId ?? data?.stripeAccountId ?? "",
      );
      const stripeAccountId = String(
        data?.stripeAccountId ?? data?.stripeConnectAccountId ?? "",
      );
      return { url, stripeConnectAccountId, stripeAccountId };
    },
    [apiFetch],
  );

  const createCheckoutSession = useCallback(
    async (listingId: string): Promise<string> => {
      const data = await apiFetch<{ url?: string }>(
        "/stripe/create-checkout-session",
        "POST",
        { listingId },
      );
      return String(data?.url ?? "");
    },
    [apiFetch],
  );

  const managePaymentCapture = useCallback( async (listingId: string, sellerAction: "capture" | "cancel") => {
      const data = await apiFetch<{ ok: boolean }>("/stripe/handle-payment-intent", "POST", { listingId, sellerAction });
      return data.ok;
  } ,[apiFetch]);

  /**
   * Seller Connect balance snapshot - amounts come back in MAJOR units (dollars).
   * Returns `connected: false` when the seller has not started onboarding yet.
   */
  const getConnectBalance = useCallback(
    async (): Promise<ConnectBalanceResponse> =>
      apiFetch<ConnectBalanceResponse>("/stripe/connect-balance", "GET"),
    [apiFetch],
  );

  /** Seller payout batches (platform cron → Stripe), paginated. */
  const getPayoutBatches = useCallback(
    async (page = 1, limit = 10): Promise<PayoutBatchesResponse> =>
      apiFetch<PayoutBatchesResponse>(
        `/stripe/payout-batches?page=${encodeURIComponent(String(page))}&limit=${encodeURIComponent(String(limit))}`,
        "GET",
      ),
    [apiFetch],
  );

  /** Charges on this user's Stripe customer (listing fees, purchases, etc.). */
  const getBillingHistory = useCallback(
    async (limit = 50): Promise<BillingHistoryResponse> =>
      apiFetch<BillingHistoryResponse>(
        `/stripe/billing-history?limit=${encodeURIComponent(String(limit))}`,
        "GET",
      ),
    [apiFetch],
  );

  return {
    getPaymentMethods,
    createSetupIntent,
    updateDefaultPayment,
    deletePaymentMethods,
    startSellerOnboarding,
    createCheckoutSession,
    managePaymentCapture,
    getConnectBalance,
    getPayoutBatches,
    getBillingHistory,
  };
};
