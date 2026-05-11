"use client";

import { useCallback } from "react";

import { useApiFetchOrThrow } from "@/hooks/use-api-fetch";

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
  paymentMethods: { data: StripePaymentMethod[] };
};

export const useStripeWallet = () => {
  const { apiFetch } = useApiFetchOrThrow();

  /** List saved cards for a Stripe customer. */
  const getPaymentMethods = useCallback(
    async (stripeCustomerId: string): Promise<PaymentMethodsResponse | undefined> => {
      try {
        const data = await apiFetch<PaymentMethodsResponse | { error?: any}>(
          `/stripe/payment-methods?stripeCustomerId=${encodeURIComponent(stripeCustomerId)}`,
          "GET",
        );
        if(!data) {
          throw new Error((data as { error?: string })?.error || "No data returned from API");
        }
        return data as PaymentMethodsResponse;
      } catch(err) {
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
    async (opts: { hasExistingAccount: boolean }): Promise<string> => {
      const path = opts.hasExistingAccount
        ? "/stripe/refreshed-onboarding-link"
        : "/stripe/create-connect-account";
      const method = opts.hasExistingAccount ? "GET" : "POST";

      const data = await apiFetch<{ url?: string }>(path, method);
      return String(data?.url || "");
    },
    [apiFetch],
  );

  return {
    getPaymentMethods,
    createSetupIntent,
    updateDefaultPayment,
    deletePaymentMethods,
    startSellerOnboarding,
  };
};
