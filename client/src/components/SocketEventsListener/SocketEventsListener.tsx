"use client";

import { useEffect } from "react";

import { useSocket } from "@/context/socket-io/socket-provider";
import { Notifications } from "@/context/socket-io/events";
import { useInvalidateQuery } from "@/hooks/invalidateQuery";
import { pushToast } from "@/hooks/use-toast";

type AnyData = Record<string, unknown> & { message?: string };

/**
 * Mounted once in the root layout. Subscribes to every socket event the
 * backend currently emits and:
 *
 *   1. Shows a toast with the server-provided message, if any.
 *   2. Invalidates the React Query keys affected by the event so the
 *      relevant UI refreshes without a manual refetch.
 *
 * Handlers are kept inline and small on purpose — once the list grows
 * past ~20, split them out into a `./handlers.ts` module like the RN
 * version.
 */
export default function SocketEventsListener() {
  const { socket } = useSocket();
  const { invalidateQuery } = useInvalidateQuery();

  useEffect(() => {
    if (!socket) return;

    // ── Stripe: buyer ──────────────────────────────────────────────────
    const onCardAdded = async (data: AnyData) => {
      pushToast({
        severity: "success",
        title: data?.message || "Card saved",
        description: "Your new payment method is ready to use.",
      });
      await Promise.all([
        invalidateQuery("stripe-payment-methods"),
        invalidateQuery("stripe-wallet"),
      ]);
    };

    const onPurchaseSucceeded = async (data: AnyData) => {
      pushToast({
        severity: "success",
        title: data?.message || "Purchase complete",
      });
      await Promise.all([
        invalidateQuery("my-listings"),
        invalidateQuery("my-purchases"),
        invalidateQuery("listing"),
      ]);
    };

    const onPurchaseFailed = async (data: AnyData) => {
      pushToast({
        severity: "error",
        title: data?.message || "Payment failed",
        description: "No charge was made — please try another card.",
      });
    };

    const onPurchaseCanceled = async (data: AnyData) => {
      pushToast({
        severity: "info",
        title: data?.message || "Checkout canceled",
      });
    };

    const onRefundStarted = async (data: AnyData) => {
      pushToast({
        severity: "info",
        title: data?.message || "Refund started",
      });
      await invalidateQuery("my-purchases");
    };

    const onRefundCompleted = async (data: AnyData) => {
      pushToast({
        severity: "success",
        title: data?.message || "Refund complete",
      });
      await Promise.all([
        invalidateQuery("my-purchases"),
        invalidateQuery("my-listings"),
      ]);
    };

    // ── Listing fee (seller pays to publish) ───────────────────────────
    const onListingFeePaid = async (data: AnyData) => {
      pushToast({
        severity: "success",
        title: data?.message || "Your listing is live",
        description:
          typeof data?.text === "string"
            ? (data.text as string)
            : "Buyers can now see it on the marketplace.",
      });
      await Promise.all([
        invalidateQuery("my-listings"),
        invalidateQuery("listings"),
      ]);
    };

    const onListingFeeFailed = async (data: AnyData) => {
      pushToast({
        severity: "error",
        title: data?.message || "Listing fee failed",
        description:
          typeof data?.text === "string"
            ? (data.text as string)
            : "We couldn't charge your listing fee — please update your card.",
      });
      await invalidateQuery("my-listings");
    };

    const onListingFeeRefunded = async (data: AnyData) => {
      pushToast({
        severity: "info",
        title: data?.message || "Listing fee refunded",
        description:
          typeof data?.text === "string"
            ? (data.text as string)
            : undefined,
      });
      await Promise.all([
        invalidateQuery("my-listings"),
        invalidateQuery("stripe-wallet"),
      ]);
    };

    // ── Stripe: seller payouts ─────────────────────────────────────────
    const onPayoutCreated = async (data: AnyData) => {
      pushToast({
        severity: "info",
        title: data?.message || "Payout scheduled",
      });
      await invalidateQuery("stripe-wallet");
    };

    const onPayoutPaid = async (data: AnyData) => {
      pushToast({
        severity: "success",
        title: data?.message || "Payout arrived",
      });
      await invalidateQuery("stripe-wallet");
    };

    const onPayoutFailed = async (data: AnyData) => {
      pushToast({
        severity: "error",
        title: data?.message || "Payout failed",
        description: "We'll retry automatically — check your wallet for details.",
      });
      await invalidateQuery("stripe-wallet");
    };

    const onPayoutCanceled = async (data: AnyData) => {
      pushToast({
        severity: "warning",
        title: data?.message || "Payout canceled",
      });
      await invalidateQuery("stripe-wallet");
    };

    // ── Marketplace (reserved for future backend emitters) ─────────────
    const onListingApproved = async (data: AnyData) => {
      pushToast({
        severity: "success",
        title: data?.message || "Listing approved",
      });
      await invalidateQuery("my-listings");
    };

    const onListingRejected = async (data: AnyData) => {
      pushToast({
        severity: "error",
        title: data?.message || "Listing needs changes",
      });
      await invalidateQuery("my-listings");
    };

    const onListingSold = async (data: AnyData) => {
      pushToast({
        severity: "success",
        title: data?.message || "You made a sale!",
      });
      await Promise.all([
        invalidateQuery("my-listings"),
        invalidateQuery("my-sales"),
      ]);
    };

    const onNewMessage = async (data: AnyData) => {
      pushToast({
        severity: "info",
        title: data?.message || "New message",
      });
      await Promise.all([
        invalidateQuery("chats"),
        invalidateQuery("chat"),
      ]);
    };

    const onNewReview = async (data: AnyData) => {
      pushToast({
        severity: "info",
        title: data?.message || "New review",
      });
      await invalidateQuery("my-reviews");
    };

    const onDisputeOpened = async (data: AnyData) => {
      pushToast({
        severity: "warning",
        title: data?.message || "Dispute opened",
      });
      await invalidateQuery("disputes");
    };

    const onDisputeResolved = async (data: AnyData) => {
      pushToast({
        severity: "info",
        title: data?.message || "Dispute resolved",
      });
      await invalidateQuery("disputes");
    };

    socket.on(Notifications.CARD_ADDED, onCardAdded);
    socket.on(Notifications.PURCHASE_SUCCEEDED, onPurchaseSucceeded);
    socket.on(Notifications.PURCHASE_FAILED, onPurchaseFailed);
    socket.on(Notifications.PURCHASE_CANCELED, onPurchaseCanceled);
    socket.on(Notifications.REFUND_STARTED, onRefundStarted);
    socket.on(Notifications.REFUND_COMPLETED, onRefundCompleted);
    socket.on(Notifications.LISTING_FEE_PAID, onListingFeePaid);
    socket.on(Notifications.LISTING_FEE_FAILED, onListingFeeFailed);
    socket.on(Notifications.LISTING_FEE_REFUNDED, onListingFeeRefunded);
    socket.on(Notifications.PAYOUT_CREATED, onPayoutCreated);
    socket.on(Notifications.PAYOUT_PAID, onPayoutPaid);
    socket.on(Notifications.PAYOUT_FAILED, onPayoutFailed);
    socket.on(Notifications.PAYOUT_CANCELED, onPayoutCanceled);
    socket.on(Notifications.LISTING_APPROVED, onListingApproved);
    socket.on(Notifications.LISTING_REJECTED, onListingRejected);
    socket.on(Notifications.LISTING_SOLD, onListingSold);
    socket.on(Notifications.NEW_MESSAGE, onNewMessage);
    socket.on(Notifications.NEW_REVIEW, onNewReview);
    socket.on(Notifications.DISPUTE_OPENED, onDisputeOpened);
    socket.on(Notifications.DISPUTE_RESOLVED, onDisputeResolved);

    return () => {
      socket.off(Notifications.CARD_ADDED, onCardAdded);
      socket.off(Notifications.PURCHASE_SUCCEEDED, onPurchaseSucceeded);
      socket.off(Notifications.PURCHASE_FAILED, onPurchaseFailed);
      socket.off(Notifications.PURCHASE_CANCELED, onPurchaseCanceled);
      socket.off(Notifications.REFUND_STARTED, onRefundStarted);
      socket.off(Notifications.REFUND_COMPLETED, onRefundCompleted);
      socket.off(Notifications.LISTING_FEE_PAID, onListingFeePaid);
      socket.off(Notifications.LISTING_FEE_FAILED, onListingFeeFailed);
      socket.off(Notifications.LISTING_FEE_REFUNDED, onListingFeeRefunded);
      socket.off(Notifications.PAYOUT_CREATED, onPayoutCreated);
      socket.off(Notifications.PAYOUT_PAID, onPayoutPaid);
      socket.off(Notifications.PAYOUT_FAILED, onPayoutFailed);
      socket.off(Notifications.PAYOUT_CANCELED, onPayoutCanceled);
      socket.off(Notifications.LISTING_APPROVED, onListingApproved);
      socket.off(Notifications.LISTING_REJECTED, onListingRejected);
      socket.off(Notifications.LISTING_SOLD, onListingSold);
      socket.off(Notifications.NEW_MESSAGE, onNewMessage);
      socket.off(Notifications.NEW_REVIEW, onNewReview);
      socket.off(Notifications.DISPUTE_OPENED, onDisputeOpened);
      socket.off(Notifications.DISPUTE_RESOLVED, onDisputeResolved);
    };
  }, [socket, invalidateQuery]);

  return null;
}
