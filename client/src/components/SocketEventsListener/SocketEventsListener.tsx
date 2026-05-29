"use client";

import { useEffect } from "react";

import { useAuth } from "@/context/auth-context";
import { useSocket } from "@/context/socket-io/socket-provider";
import { Notifications } from "@/context/socket-io/events";
import { useSnackbar } from "@/context/snackbar-context";
import { useInvalidateQuery } from "@/hooks/invalidateQuery";

type AnyData = Record<string, unknown> & { message?: string };

function settingsPath(userId: string | undefined, suffix = ""): string | undefined {
  if (!userId) return undefined;
  const base = `/my-settings/${encodeURIComponent(userId)}`;
  return suffix ? `${base}${suffix}` : base;
}

function listingIdFromData(data: AnyData): string | undefined {
  const raw = data?.listingId;
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

function isOwnBidRecordedMessage(m?: string) {
  return typeof m === "string" && m.toLowerCase().includes("your bid was recorded");
}

/**
 * Mounted once in the root layout. Subscribes to every socket event the
 * backend currently emits and:
 *
 *   1. Shows a global snackbar (see SnackbarProvider) with optional deep-link.
 *   2. Invalidates the React Query keys affected by the event so the
 *      relevant UI refreshes without a manual refetch.
 */
export default function SocketEventsListener() {
  const { socket } = useSocket();
  const { invalidateQuery } = useInvalidateQuery();
  const { showSnackbar } = useSnackbar();
  const { user, syncUserFromServer } = useAuth();

  const uid = user?.id ? String(user.id) : undefined;

  useEffect(() => {
    if (!socket) return;

    const onCardAdded = async (data: AnyData) => {
      showSnackbar({
        title: "Wallet",
        message: data?.message || "Card saved",
        description: "Your new payment method is ready to use.",
        severity: "success",
        path: settingsPath(uid, "/wallet"),
        actionLabel: "Wallet",
      });
      await Promise.all([
        invalidateQuery("stripe-payment-methods"),
        invalidateQuery("stripe-wallet"),
      ]);
    };

    const onPurchaseSucceeded = async (data: AnyData) => {
      const lid = listingIdFromData(data);
      const exchangePath =
        lid != null ? `/exchange/${encodeURIComponent(lid)}` : undefined;
      showSnackbar({
        title: "Marketplace",
        message: data?.message || "Purchase complete",
        description: exchangePath
          ? "Open the exchange room to coordinate handover and asset transfer."
          : undefined,
        severity: "success",
        path: exchangePath ?? settingsPath(uid),
        actionLabel: exchangePath ? "Exchange room" : "Dashboard",
      });
      await Promise.all([
        invalidateQuery("my-listings"),
        invalidateQuery("my-purchases"),
        invalidateQuery("my-marketplace-orders"),
        invalidateQuery("listing"),
        invalidateQuery("listing-exchange"),
        ...(lid != null
          ? [invalidateQuery(["listing-exchange", lid])]
          : []),
        invalidateQuery("stripe-wallet"),
        // Profile counters (totalSales, totalListingsSold) bumped server-side.
        syncUserFromServer().catch(() => null),
      ]);
    };

    const onPurchaseFailed = async (data: AnyData) => {
      showSnackbar({
        title: "Checkout",
        message: data?.message || "Payment failed",
        description: "No charge was made — please try another card.",
        severity: "error",
        path: settingsPath(uid, "/wallet"),
        actionLabel: "Wallet",
      });
    };

    const onPurchaseCanceled = async (data: AnyData) => {
      const lid = listingIdFromData(data);
      showSnackbar({
        title: "Checkout",
        message: data?.message || "Checkout canceled",
        severity: "info",
      });
      if (lid != null) {
        await invalidateQuery(["listing-exchange", lid]);
      }
    };

    const onRefundStarted = async (data: AnyData) => {
      showSnackbar({
        title: "Orders",
        message: data?.message || "Refund started",
        severity: "info",
        path: settingsPath(uid),
        actionLabel: "Dashboard",
      });
      await Promise.all([invalidateQuery("my-purchases"), invalidateQuery("my-marketplace-orders")]);
    };

    const onRefundCompleted = async (data: AnyData) => {
      showSnackbar({
        title: "Orders",
        message: data?.message || "Refund complete",
        severity: "success",
        path: settingsPath(uid),
        actionLabel: "Dashboard",
      });
      await Promise.all([
        invalidateQuery("my-purchases"),
        invalidateQuery("my-marketplace-orders"),
        invalidateQuery("my-listings"),
      ]);
    };

    const onListingFeePaid = async (data: AnyData) => {
      showSnackbar({
        title: "Listings",
        message: data?.message || "Listing submitted for review",
        description:
          typeof data?.text === "string"
            ? (data.text as string)
            : "Payment succeeded. Admin review is required before it goes live.",
        severity: "success",
        path: settingsPath(uid),
        actionLabel: "Dashboard",
      });
      await Promise.all([
        invalidateQuery("my-listings"),
        invalidateQuery("listings"),
      ]);
    };

    const onListingFeeFailed = async (data: AnyData) => {
      showSnackbar({
        title: "Listings",
        message: data?.message || "Listing fee failed",
        description:
          typeof data?.text === "string"
            ? (data.text as string)
            : "We couldn't charge your listing fee — please update your card.",
        severity: "error",
        path: settingsPath(uid, "/wallet"),
        actionLabel: "Wallet",
      });
      await invalidateQuery("my-listings");
    };

    const onListingFeeRefunded = async (data: AnyData) => {
      showSnackbar({
        title: "Listings",
        message: data?.message || "Listing fee refunded",
        description:
          typeof data?.text === "string" ? (data.text as string) : undefined,
        severity: "info",
        path: settingsPath(uid),
        actionLabel: "Dashboard",
      });
      await Promise.all([
        invalidateQuery("my-listings"),
        invalidateQuery("stripe-wallet"),
      ]);
    };

    const onPayoutCreated = async (data: AnyData) => {
      showSnackbar({
        title: "Payouts",
        message: data?.message || "Payout scheduled",
        severity: "info",
        path: settingsPath(uid, "/wallet"),
        actionLabel: "Wallet",
      });
      await invalidateQuery("stripe-wallet");
    };

    const onPayoutPaid = async (data: AnyData) => {
      showSnackbar({
        title: "Payouts",
        message: data?.message || "Payout arrived",
        severity: "success",
        path: settingsPath(uid, "/wallet"),
        actionLabel: "Wallet",
      });
      await invalidateQuery("stripe-wallet");
    };

    const onPayoutFailed = async (data: AnyData) => {
      showSnackbar({
        title: "Payouts",
        message: data?.message || "Payout failed",
        description: "We'll retry automatically — check your wallet for details.",
        severity: "error",
        path: settingsPath(uid, "/wallet"),
        actionLabel: "Wallet",
      });
      await invalidateQuery("stripe-wallet");
    };

    const onPayoutCanceled = async (data: AnyData) => {
      showSnackbar({
        title: "Payouts",
        message: data?.message || "Payout canceled",
        severity: "warning",
        path: settingsPath(uid, "/wallet"),
        actionLabel: "Wallet",
      });
      await invalidateQuery("stripe-wallet");
    };

    const onListingApproved = async (data: AnyData) => {
      showSnackbar({
        title: "Listings",
        message: data?.message || "Listing approved",
        severity: "success",
        path: settingsPath(uid),
        actionLabel: "Dashboard",
      });
      await invalidateQuery("my-listings");
    };

    const onListingRejected = async (data: AnyData) => {
      showSnackbar({
        title: "Listings",
        message: data?.message || "Listing needs changes",
        severity: "error",
        path: settingsPath(uid),
        actionLabel: "Dashboard",
      });
      await invalidateQuery("my-listings");
    };

    const onExchangeUpdated = async (data: AnyData) => {
      const action = typeof data?.action === "string" ? data.action : "";
      const lid = listingIdFromData(data);
      if (action === "captured") {
        showSnackbar({
          title: "Exchange",
          message: data?.message || "Payment captured.",
          description:
            "Funds are now in your Stripe balance. The buyer can confirm receipt at any time.",
          severity: "success",
          path: lid ? `/exchange/${encodeURIComponent(lid)}` : undefined,
          actionLabel: lid ? "Open room" : undefined,
        });
      } else if (action === "canceled") {
        showSnackbar({
          title: "Exchange",
          message: data?.message || "Authorization canceled.",
          severity: "warning",
          path: lid ? `/exchange/${encodeURIComponent(lid)}` : undefined,
          actionLabel: lid ? "Open room" : undefined,
        });
      }
      await Promise.all([
        invalidateQuery("listing-exchange"),
        invalidateQuery("my-listings"),
        invalidateQuery("my-marketplace-orders"),
        invalidateQuery("stripe-wallet"),
      ]);
    };

    const onListingSold = async (data: AnyData) => {
      showSnackbar({
        title: "Sales",
        message: data?.message || "You made a sale!",
        severity: "success",
        path: settingsPath(uid),
        actionLabel: "Dashboard",
      });
      await Promise.all([
        invalidateQuery("my-listings"),
        invalidateQuery("my-sales"),
        syncUserFromServer().catch(() => null),
      ]);
    };

    const onPrivateListingRequestCreated = async (data: AnyData) => {
      const lid = listingIdFromData(data);
      const reviewPath =
        lid && uid
          ? `${settingsPath(uid)}?reviewPrivateAccess=${encodeURIComponent(lid)}#my-listings`
          : settingsPath(uid);
      showSnackbar({
        title: "Private listing",
        message: data?.message || "New private access request",
        severity: "info",
        path: reviewPath,
        actionLabel: "Review",
      });
      await Promise.all([
        invalidateQuery("my-listings"),
        invalidateQuery("listing"),
      ]);
    };

    const onPrivateListingRequestResolved = async (data: AnyData) => {
      const lid = listingIdFromData(data);
      const status = String(data?.status ?? "");
      showSnackbar({
        title: "Private listing",
        message:
          data?.message ||
          (status === "approved"
            ? "Access approved."
            : status === "denied"
              ? "Access denied."
              : "Private access updated."),
        severity: status === "denied" ? "warning" : "success",
        path: lid ? `/products/${encodeURIComponent(lid)}` : undefined,
        actionLabel: lid ? "Open listing" : undefined,
      });
      await Promise.all([
        invalidateQuery("my-listings"),
        invalidateQuery("listing"),
      ]);
    };

    const onNewMessage = async (data: AnyData) => {
      showSnackbar({
        title: "Messages",
        message: data?.message || "New message",
        description:
          typeof data?.preview === "string" ? (data.preview as string) : undefined,
        severity: "info",
        path: "/messages",
        actionLabel: "Open inbox",
      });
      await Promise.all([
        invalidateQuery("chats"),
        invalidateQuery("chat"),
      ]);
    };

    const onChatMessageLive = async (data: Record<string, unknown>) => {
      const text = typeof data?.text === "string" ? data.text : "";
      const preview =
        text.length > 100 ? `${text.slice(0, 100)}…` : text || "New message in a conversation.";
      const senderName = typeof data?.senderName === "string" ? data.senderName : "";
      showSnackbar({
        title: "Messages",
        message: preview,
        description: senderName ? `From ${senderName}` : undefined,
        severity: "info",
        path: "/messages",
        actionLabel: "Open inbox",
      });
      await Promise.all([
        invalidateQuery("chats"),
        invalidateQuery("chat"),
      ]);
    };

    const onAuctionBidPlaced = async (data: AnyData) => {
      const lid = listingIdFromData(data);
      if (isOwnBidRecordedMessage(data?.message)) {
        showSnackbar({
          title: "Auctions",
          message: data?.message || "Your bid was recorded.",
          severity: "info",
          path: settingsPath(uid, "/bids"),
          actionLabel: "My bids",
        });
      } else if (lid) {
        showSnackbar({
          title: "Auctions",
          message: data?.message || "New bid on your listing",
          severity: "info",
          path: `/products/${encodeURIComponent(lid)}`,
          actionLabel: "View listing",
        });
      } else {
        showSnackbar({
          title: "Auctions",
          message: data?.message || "Auction update",
          severity: "info",
          path: settingsPath(uid),
          actionLabel: "Dashboard",
        });
      }
      await Promise.all([
        invalidateQuery("my-auction-bids"),
        invalidateQuery("my-listings"),
        invalidateQuery("listing"),
      ]);
    };

    const onAuctionBidResolved = async (data: AnyData) => {
      const lid = listingIdFromData(data);
      const rejected = data?.status === "rejected";
      showSnackbar({
        title: "Auctions",
        message: data?.message || "Bid update",
        severity: rejected ? "warning" : "success",
        path: lid
          ? `/products/${encodeURIComponent(lid)}`
          : settingsPath(uid, "/bids"),
        actionLabel: lid ? "View listing" : "My bids",
      });
      await Promise.all([
        invalidateQuery("my-auction-bids"),
        invalidateQuery("my-listings"),
        invalidateQuery("listing"),
      ]);
    };

    const onNewReview = async (data: AnyData) => {
      const lid = listingIdFromData(data);
      showSnackbar({
        title: "Reviews",
        message: data?.message || "New review",
        severity: "info",
        path: lid
          ? `/products/${encodeURIComponent(lid)}`
          : settingsPath(uid),
        actionLabel: lid ? "Open listing" : "Dashboard",
      });
      // Refresh:
      //  - listing card / detail (rating + count)
      //  - the per-listing reviews list
      //  - the seller's cached profile (sellerRating / totalSellerReviews)
      await Promise.all([
        invalidateQuery("my-reviews"),
        invalidateQuery("listing"),
        invalidateQuery("listings"),
        invalidateQuery("listing-reviews"),
        invalidateQuery("my-listings"),
        syncUserFromServer().catch(() => null),
      ]);
    };

    const resolutionPath = (disputeId?: string) => {
      const base = `/my-settings/${encodeURIComponent(uid)}/resolution-center`;
      return disputeId ? `${base}/${encodeURIComponent(String(disputeId))}` : base;
    };

    const onDisputeOpened = async (data: AnyData) => {
      showSnackbar({
        title: "Disputes",
        message: data?.message || "Dispute opened",
        severity: "warning",
        path: resolutionPath(data?.disputeId as string | undefined),
        actionLabel: "View dispute",
      });
      await invalidateQuery("disputes");
      if (data?.listingId) {
        await invalidateQuery(["listing-exchange", String(data.listingId)]);
      }
    };

    const onDisputeUpdated = async (data: AnyData) => {
      showSnackbar({
        title: "Disputes",
        message: data?.message || "Dispute updated",
        severity: "info",
        path: resolutionPath(data?.disputeId as string | undefined),
        actionLabel: "View dispute",
      });
      await invalidateQuery("disputes");
      if (data?.disputeId) {
        await invalidateQuery(["dispute", String(data.disputeId)]);
      }
    };

    const onDisputeResolved = async (data: AnyData) => {
      showSnackbar({
        title: "Disputes",
        message: data?.message || "Dispute resolved",
        severity: "info",
        path: resolutionPath(data?.disputeId as string | undefined),
        actionLabel: "View dispute",
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
    socket.on(Notifications.EXCHANGE_UPDATED, onExchangeUpdated);
    socket.on(
      Notifications.PRIVATE_LISTING_REQUEST_CREATED,
      onPrivateListingRequestCreated,
    );
    socket.on(
      Notifications.PRIVATE_LISTING_REQUEST_RESOLVED,
      onPrivateListingRequestResolved,
    );
    socket.on(Notifications.NEW_MESSAGE, onNewMessage);
    socket.on("chat:message", onChatMessageLive);
    socket.on(Notifications.AUCTION_BID_PLACED, onAuctionBidPlaced);
    socket.on(Notifications.AUCTION_BID_RESOLVED, onAuctionBidResolved);
    socket.on(Notifications.NEW_REVIEW, onNewReview);
    socket.on(Notifications.DISPUTE_OPENED, onDisputeOpened);
    socket.on(Notifications.DISPUTE_UPDATED, onDisputeUpdated);
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
      socket.off(Notifications.EXCHANGE_UPDATED, onExchangeUpdated);
      socket.off(
        Notifications.PRIVATE_LISTING_REQUEST_CREATED,
        onPrivateListingRequestCreated,
      );
      socket.off(
        Notifications.PRIVATE_LISTING_REQUEST_RESOLVED,
        onPrivateListingRequestResolved,
      );
      socket.off(Notifications.NEW_MESSAGE, onNewMessage);
      socket.off("chat:message", onChatMessageLive);
      socket.off(Notifications.AUCTION_BID_PLACED, onAuctionBidPlaced);
      socket.off(Notifications.AUCTION_BID_RESOLVED, onAuctionBidResolved);
      socket.off(Notifications.NEW_REVIEW, onNewReview);
      socket.off(Notifications.DISPUTE_OPENED, onDisputeOpened);
      socket.off(Notifications.DISPUTE_UPDATED, onDisputeUpdated);
      socket.off(Notifications.DISPUTE_RESOLVED, onDisputeResolved);
    };
  }, [socket, invalidateQuery, showSnackbar, syncUserFromServer, uid]);

  return null;
}
