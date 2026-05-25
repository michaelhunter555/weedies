"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CreditCardRoundedIcon from "@mui/icons-material/CreditCardRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import LaunchRoundedIcon from "@mui/icons-material/LaunchRounded";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import MessageRoundedIcon from "@mui/icons-material/MessageRounded";
import PaidRoundedIcon from "@mui/icons-material/PaidRounded";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { DeleteListingConfirmModal } from "@/components/Listings/DeleteListingConfirmModal";
import { PrivateAccessRequestsModal } from "@/components/Listings/PrivateAccessRequestsModal";
import { MarketplaceOrdersSection } from "@/components/MySettings/MarketplaceOrdersSection";
import { useAuth } from "@/context/auth-context";
import { useListings } from "@/hooks/use-listings";
import { useUnreadMessages } from "@/hooks/use-unread-messages";
import {
  BRAND_PALETTE,
  BRAND_STAT_TINTS,
  brandContainedButtonSx,
} from "@/theme/brand-palette";
import {
  type StripePaymentMethod,
  useStripeWallet,
} from "@/hooks/use-stripe-wallet";
import type {
  AuctionBidStatus,
  Listing,
  ListingAuctionBid,
  ListingCategory,
} from "../../../../types";
import {
  countPendingPrivateAccessRequests,
  getPendingPrivateAccessRequests,
  requesterLabel,
} from "@/utils/private-listing-access";

type ListingStatus = NonNullable<Listing["status"]> | "paused" | "removed";

const statusChipProps: Record<
  ListingStatus,
  { label: string; color: "success" | "warning" | "default" | "error" }
> = {
  live: { label: "Live", color: "success" },
  pending_review: { label: "In review", color: "warning" },
  draft: { label: "Draft", color: "default" },
  rejected: { label: "Rejected", color: "error" },
  sold: { label: "Sold", color: "default" },
  paused: { label: "Paused", color: "default" },
  removed: { label: "Removed", color: "default" },
};

const categoryLabels: Record<ListingCategory, string> = {
  "ai-tools": "AI tools",
  productivity: "Productivity",
  games: "Games",
  "dev-tools": "Dev tools",
  design: "Design",
  extensions: "Extensions",
};

const FALLBACK_COVER = "/3.jpg";

export default function DashboardPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { user, hydrated, logout, update, syncUserFromServer } = useAuth();
  const { unreadCount: unreadMessages } = useUnreadMessages();
  const queryClient = useQueryClient();
  const {
    getMyListings,
    setAuctionBidStatus,
    deleteListing,
    resolvePrivateListingAccess,
  } = useListings();
  const {
    getPaymentMethods,
    startSellerOnboarding,
    getConnectBalance,
  } = useStripeWallet();

  // Seller Connect balance for the headline "Sales" stat. Skipped silently
  // when the user has not started Stripe onboarding yet.
  const sellerBalanceQuery = useQuery({
    queryKey: ["stripe-wallet", "connect-balance", user?.id],
    queryFn: () => getConnectBalance(),
    enabled: Boolean(hydrated && user?.id),
    staleTime: 60_000,
  });

  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: "error" | "success" | "info";
  }>({ open: false, message: "", severity: "info" });

  const [bidReviewListing, setBidReviewListing] = useState<Listing | null>(null);
  const [bidActionLoading, setBidActionLoading] = useState(false);
  const [listingToDelete, setListingToDelete] = useState<Listing | null>(null);
  const [deleteListingLoading, setDeleteListingLoading] = useState(false);
  const [deleteListingError, setDeleteListingError] = useState<string | null>(null);
  const [privateAccessLoadingKey, setPrivateAccessLoadingKey] = useState<string | null>(null);
  const [privateAccessListing, setPrivateAccessListing] = useState<Listing | null>(null);

  const hasConnectAccount = Boolean(
    user?.stripeConnectAccountId || user?.stripeAccountId,
  );
  const hasStripeCustomer = Boolean(user?.stripeCustomerId);
  const isStripeConnected =
    hasConnectAccount && Boolean(user?.isOnboarded);

  const hideSellerListingsUi = user?.mode === "customer";

  useEffect(() => {
    if (!hydrated || !user?.id) return;
    if (!user.stripeConnectAccountId && !user.stripeAccountId) return;
    if (user.isOnboarded) return;
    syncUserFromServer().catch(() => undefined);
  }, [
    hydrated,
    user?.id,
    user?.stripeConnectAccountId,
    user?.stripeAccountId,
    user?.isOnboarded,
    syncUserFromServer,
  ]);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  // ── Listings ────────────────────────────────────────────────────────────
  const {
    data: listings,
    isLoading: listingsLoading,
    isError: listingsError,
    error: listingsErrorObj,
  } = useQuery<Listing[], Error>({
    queryKey: ["my-listings", user?.id],
    queryFn: getMyListings,
    enabled: Boolean(hydrated && user?.id),
    staleTime: 30_000,
  });

  const activeListings = useMemo(
    () =>
      (listings ?? []).filter(
        (l) => l.status !== "sold" && l.status !== "removed",
      ),
    [listings],
  );

  const soldListings = useMemo(
    () => (listings ?? []).filter((l) => l.status === "sold"),
    [listings],
  );

  const totalPendingPrivateAccess = useMemo(
    () =>
      activeListings.reduce(
        (sum, l) => sum + countPendingPrivateAccessRequests(l),
        0,
      ),
    [activeListings],
  );

  useEffect(() => {
    if (typeof window === "undefined" || !listings?.length) return;
    const reviewId = new URLSearchParams(window.location.search)
      .get("reviewPrivateAccess")
      ?.trim();
    if (!reviewId) return;
    const target = listings.find((l) => String(l._id) === reviewId);
    if (target && countPendingPrivateAccessRequests(target) > 0) {
      setPrivateAccessListing(target);
    }
  }, [listings]);

  // ── Payment methods (buyer billing) ─────────────────────────────────────
  const {
    data: paymentMethods,
    isLoading: cardsLoading,
    isError: cardsError,
  } = useQuery({
    queryKey: ["stripe-payment-methods", user?.stripeCustomerId],
    queryFn: () => getPaymentMethods(String(user?.stripeCustomerId)),
    enabled: Boolean(hydrated && hasStripeCustomer),
    //staleTime: 60_000,
  });

  const cardList: StripePaymentMethod[] =
    paymentMethods?.paymentMethods?.data ?? [];

  const country = new Intl.DateTimeFormat().resolvedOptions().locale;
  const countryCode = country.split("-")[1];

  // ── Stripe Connect onboarding ───────────────────────────────────────────
  const onboardMutation = useMutation({
    mutationKey: ["stripe-seller-onboard", user?.id],
    mutationFn: () =>
      startSellerOnboarding({ hasExistingAccount: hasConnectAccount, countryCode: countryCode }),
    onSuccess: (result) => {
      if (user && result.stripeConnectAccountId) {
        update({
          ...user,
          stripeConnectAccountId: result.stripeConnectAccountId,
          stripeAccountId: result.stripeAccountId || result.stripeConnectAccountId,
        });
      }
      if (result.url) {
        window.location.href = result.url;
        return;
      }
      setToast({
        open: true,
        severity: "error",
        message: "Stripe didn't return an onboarding URL. Try again shortly.",
      });
    },
    onError: (err: Error) => {
      setToast({
        open: true,
        severity: "error",
        message: err?.message ?? "Could not start Stripe onboarding.",
      });
    },
  });

  const handleStripeOnboard = () => onboardMutation.mutate();

  const sortedAuctionBidsForDialog = useMemo((): ListingAuctionBid[] => {
    if (!bidReviewListing?.auctionBids?.length) return [];
    const rank: Record<AuctionBidStatus, number> = {
      pending: 0,
      accepted: 1,
      rejected: 2,
    };
    return [...bidReviewListing.auctionBids].sort((a, b) => {
      const dr = rank[a.bidStatus] - rank[b.bidStatus];
      if (dr !== 0) return dr;
      return (
        new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
      );
    });
  }, [bidReviewListing]);

  const handleResolveAuctionBid = async (
    bidId: string,
    status: "accepted" | "rejected",
  ) => {
    if (!bidReviewListing?._id || bidActionLoading) return;
    setBidActionLoading(true);
    try {
      await setAuctionBidStatus(String(bidReviewListing._id), bidId, status);
      await queryClient.invalidateQueries({ queryKey: ["my-listings", user?.id] });
      await queryClient.invalidateQueries({ queryKey: ["my-auction-bids"] });
      setBidReviewListing(null);
      setToast({
        open: true,
        severity: "success",
        message: status === "accepted" ? "Bid accepted." : "Bid rejected.",
      });
    } catch (e) {
      setToast({
        open: true,
        severity: "error",
        message: e instanceof Error ? e.message : "Could not update bid.",
      });
    } finally {
      setBidActionLoading(false);
    }
  };

  const handleConfirmDeleteListing = async () => {
    if (!listingToDelete?._id || deleteListingLoading) return;
    setDeleteListingLoading(true);
    setDeleteListingError(null);
    try {
      await deleteListing(String(listingToDelete._id));
      await queryClient.invalidateQueries({ queryKey: ["my-listings", user?.id] });
      setListingToDelete(null);
      setToast({
        open: true,
        severity: "success",
        message: "Listing removed from the marketplace.",
      });
    } catch (e) {
      setDeleteListingError(
        e instanceof Error ? e.message : "Could not remove listing.",
      );
    } finally {
      setDeleteListingLoading(false);
    }
  };

  const handleResolvePrivateAccess = async (
    listingId: string,
    requestId: string,
    decision: "approve" | "deny",
  ) => {
    if (!listingId || !requestId || privateAccessLoadingKey) return;
    setPrivateAccessLoadingKey(`${listingId}:${requestId}`);
    try {
      await resolvePrivateListingAccess(listingId, requestId, decision);
      await queryClient.invalidateQueries({ queryKey: ["my-listings", user?.id] });
      setToast({
        open: true,
        severity: "success",
        message: decision === "approve" ? "Access approved." : "Access denied.",
      });
    } catch (e) {
      setToast({
        open: true,
        severity: "error",
        message:
          e instanceof Error ? e.message : "Could not resolve access request.",
      });
    } finally {
      setPrivateAccessLoadingKey(null);
    }
  };

  // ── Derived stats ───────────────────────────────────────────────────────
  // `user.totalListings` is a lifetime submit counter on the server (never
  // decremented on soft-delete). The headline should match what we actually
  // show in "My listings" — use the same pool as `activeListings` once loaded.
  const totalListingsCount =
    listings !== undefined
      ? activeListings.length
      : Number(user?.totalListings ?? 0);
  const salesCount = Number(
    user?.totalListingsSold ?? user?.totalSales ?? 0,
  );
  const balanceData = sellerBalanceQuery.data;
  const balanceCurrency = balanceData?.currency || "USD";
  const liveBalance = balanceData
    ? Number(balanceData.available ?? 0) + Number(balanceData.pending ?? 0)
    : 0;
  const formattedBalance = (() => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: balanceCurrency.toUpperCase(),
        maximumFractionDigits: 0,
      }).format(liveBalance);
    } catch {
      return `$${liveBalance.toFixed(0)}`;
    }
  })();
  const salesValue =
    !balanceData || !balanceData.connected
      ? salesCount > 0
        ? `${salesCount} sold`
        : "—"
      : formattedBalance;
  const salesDelta = (() => {
    if (sellerBalanceQuery.isLoading) return "Loading balance…";
    if (!balanceData || !balanceData.connected) {
      return salesCount > 0
        ? "Connect Stripe to track revenue"
        : "Your first sale is on its way";
    }
    const pendingPart =
      balanceData.pending > 0
        ? ` · ${new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: balanceCurrency.toUpperCase(),
            maximumFractionDigits: 0,
          }).format(balanceData.pending)} pending`
        : "";
    return `${salesCount} lifetime sale${salesCount === 1 ? "" : "s"}${pendingPart}`;
  })();

  const stats = useMemo(
    () => [
      {
        id: "listings" as const,
        label: "Active listings",
        value: String(totalListingsCount),
        delta: activeListings.length
          ? `${activeListings.length} live or pending`
          : "No active listings yet",
        icon: <AutoAwesomeIcon />,
        tint: BRAND_STAT_TINTS.listings,
      },
      {
        id: "sales" as const,
        label: "Sales revenue",
        value: salesValue,
        delta: salesDelta,
        icon: <TrendingUpRoundedIcon />,
        tint: BRAND_STAT_TINTS.sales,
      },
      {
        id: "messages" as const,
        label: "Unread messages",
        value: String(unreadMessages),
        delta: unreadMessages > 0 ? "Open inbox" : "Inbox is clear",
        icon: <MessageRoundedIcon />,
        tint: BRAND_STAT_TINTS.messages,
      },
    ],
    [
      totalListingsCount,
      activeListings.length,
      salesValue,
      salesDelta,
      unreadMessages,
    ],
  );

  const displayName =
    user?.name ||
    user?.userName ||
    (user?.email ? user.email.split("@")[0] : "there");

  // ── Auth guard ──────────────────────────────────────────────────────────
  if (!hydrated) {
    return (
      <Container maxWidth="lg" sx={{ py: 10, textAlign: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!user) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Alert
          severity="warning"
          action={
            <Button component={Link} href="/login" size="small" color="inherit">
              Log in
            </Button>
          }
        >
          Please log in to access your dashboard.
        </Alert>
      </Container>
    );
  }

  const routeUserId = params?.id ? String(params.id).trim() : "";
  const sessionUserId = String(user.id).trim();
  if (routeUserId && sessionUserId && routeUserId !== sessionUserId) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          This dashboard URL belongs to a different account. Use your own link
          - no automatic redirect.
        </Alert>
        <Button
          component={Link}
          variant="contained"
          href={`/my-settings/${encodeURIComponent(sessionUserId)}`}
          sx={{ textTransform: "none", borderRadius: 999 }}
        >
          Open my dashboard
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      {/* Top bar - support + Stripe summary */}
      <Button onClick={handleLogout}>Logout</Button>
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 4,
          p: { xs: 2, md: 2.5 },
          mb: 3,
          borderColor: "#ececec",
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ xs: "flex-start", md: "center" }}
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar
              sx={{
                bgcolor: BRAND_PALETTE.seafoam,
                color: BRAND_PALETTE.onPrimary,
                width: 44,
                height: 44,
              }}
            >
              {displayName?.[0]?.toUpperCase() || "V"}
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
                Hey, {displayName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user.email}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            <Button
              component={Link}
              href="/support"
              variant="outlined"
              size="small"
              startIcon={<SupportAgentRoundedIcon />}
              sx={{
                borderRadius: 999,
                textTransform: "none",
                borderColor: "#e5e7eb",
                color: "text.primary",
                "&:hover": { borderColor: "#cbd5e1", bgcolor: "#f8fafc" },
              }}
            >
              Contact support
            </Button>

            {isStripeConnected ? (
              <Chip
                icon={<CheckCircleRoundedIcon />}
                label="Stripe connected"
                color="success"
                variant="outlined"
                sx={{ fontWeight: 700, borderRadius: 2 }}
              />
            ) : (
              <Button
                onClick={handleStripeOnboard}
                disabled={onboardMutation.isPending}
                variant="contained"
                size="small"
                startIcon={<PaidRoundedIcon />}
                sx={{
                  borderRadius: 999,
                  textTransform: "none",
                  fontWeight: 700,
                  boxShadow: "none",
                  backgroundColor: "#635bff",
                  "&:hover": { backgroundColor: "#5246e8", boxShadow: "none" },
                }}
              >
                {onboardMutation.isPending
                  ? "Redirecting…"
                  : hasConnectAccount
                    ? "Finish onboarding"
                    : "Onboard with Stripe"}
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>

      {!isStripeConnected && (
        <Alert
          severity="warning"
          icon={<ErrorRoundedIcon />}
          sx={{ borderRadius: 3, mb: 3 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={handleStripeOnboard}
              disabled={onboardMutation.isPending}
            >
              {hasConnectAccount ? "Resume" : "Start"}
            </Button>
          }
        >
          Your listings cannot be purchased by users until Stripe onboarding is complete.
          Takes about 2 minutes.
        </Alert>
      )}

      {/* Row 1 - stat cards */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ mb: 3, width: "100%" }}
      >
        {stats.map((s) => (
          <Paper
            key={s.id}
            variant="outlined"
            sx={{
              p: 2.5,
              borderRadius: 4,
              borderColor: "#ececec",
              position: "relative",
              overflow: "hidden",
              flex: 1,
              minWidth: 0,
            }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 3,
                  backgroundColor: s.tint,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {s.icon}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary">
                  {s.label}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
                  {s.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {s.delta}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        ))}
      </Stack>

      <Box sx={{ mb: 3 }}>
        <MarketplaceOrdersSection
          userId={String(user.id)}
          variant="compact"
          ordersPageHref={`/my-settings/${encodeURIComponent(String(user.id))}/order-history`}
        />
      </Box>

      {/* Row 2 - Integrations (Stripe onboarding) + Payment options */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        alignItems="stretch"
        sx={{ mb: 3, width: "100%" }}
      >
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 2.5, md: 3 },
            borderRadius: 4,
            borderColor: "#ececec",
            height: "100%",
            flex: 1,
            minWidth: 0,
          }}
        >
          <Stack spacing={2}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  bgcolor: "#635bff",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: 14,
                }}
              >
                S
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  Integrations
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Where payouts and billing live.
                </Typography>
              </Box>
            </Stack>

            <Divider />

            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={2}
            >
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Stripe Connect
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {isStripeConnected
                    ? "Payouts are enabled. Funds clear on rolling 2-day basis."
                    : hasConnectAccount
                      ? "Onboarding started - finish verification to enable payouts."
                      : "Connect your bank to start receiving payouts."}
                </Typography>
              </Box>
              {isStripeConnected ? (
                <Chip
                  icon={<CheckCircleRoundedIcon />}
                  label="Onboarded"
                  color="success"
                  sx={{ fontWeight: 700, borderRadius: 2 }}
                />
              ) : (
                <Button
                  onClick={handleStripeOnboard}
                  disabled={onboardMutation.isPending}
                  variant="contained"
                  size="small"
                  sx={{
                    borderRadius: 999,
                    textTransform: "none",
                    fontWeight: 700,
                    boxShadow: "none",
                    backgroundColor: "#635bff",
                    "&:hover": { backgroundColor: "#5246e8", boxShadow: "none" },
                  }}
                >
                  {onboardMutation.isPending
                    ? "Redirecting…"
                    : hasConnectAccount
                      ? "Finish onboarding"
                      : "Onboard with Stripe"}
                </Button>
              )}
            </Stack>
          </Stack>
        </Paper>

        <Paper
          variant="outlined"
          sx={{
            p: { xs: 2.5, md: 3 },
            borderRadius: 4,
            borderColor: "#ececec",
            height: "100%",
            flex: 1,
            minWidth: 0,
          }}
        >
          <Stack spacing={2}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  Payment options
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Cards we use to charge you for purchases.
                </Typography>
              </Box>
              <Button
                component={Link}
                href={`/my-settings/${user.id}/wallet`}
                size="small"
                variant="text"
                startIcon={<AddRoundedIcon />}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  color: "text.primary",
                }}
              >
                Manage
              </Button>
            </Stack>

            <Divider />

            <Stack spacing={1.5}>
              {cardsLoading && (
                <Stack spacing={1}>
                  <Skeleton variant="rounded" height={56} />
                  <Skeleton variant="rounded" height={56} />
                </Stack>
              )}

              {!cardsLoading && cardsError && (
                <Alert severity="error" variant="outlined">
                  Couldn&rsquo;t load saved cards.
                </Alert>
              )}

              {!cardsLoading && !cardsError && !hasStripeCustomer && (
                <Typography variant="body2" color="text.secondary">
                  Add a card to enable one-click purchases.
                </Typography>
              )}

              {!cardsLoading &&
                !cardsError &&
                hasStripeCustomer &&
                cardList.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No cards on file yet.
                  </Typography>
                )}

              {cardList.map((pm) => {
                const isDefault =
                  user.stripeDefaultPaymentMethodId === pm.id;
                return (
                  <Stack
                    key={pm.id}
                    direction="row"
                    alignItems="center"
                    spacing={1.5}
                    sx={{
                      p: 1.25,
                      border: "1px solid #f1f5f9",
                      borderRadius: 2,
                    }}
                  >
                    <Avatar
                      variant="rounded"
                      sx={{
                        width: 40,
                        height: 28,
                        bgcolor: "#f1f5f9",
                        color: "#0f172a",
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      <CreditCardRoundedIcon sx={{ fontSize: 16 }} />
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                          lineHeight: 1.2,
                          textTransform: "capitalize",
                        }}
                        noWrap
                      >
                        {pm.card.brand} •••• {pm.card.last4}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Expires {pm.card.exp_month}/{pm.card.exp_year}
                      </Typography>
                    </Box>
                    {isDefault && (
                      <Chip
                        label="Default"
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ fontWeight: 700 }}
                      />
                    )}
                    <Tooltip title="Manage">
                      <IconButton
                        size="small"
                        component={Link}
                        href={`/my-settings/${user.id}/wallet`}
                      >
                        <EditRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                );
              })}
            </Stack>
          </Stack>
        </Paper>
      </Stack>

      {!hideSellerListingsUi ? (
        <>
      {/* Row 3 - Active listings */}
      <Stack
        id="my-listings"
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 1.5, mt: 1 }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            Active listings
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Edit details, monitor engagement, and pause anytime.
          </Typography>
        </Box>
        <Button
          onClick={() => router.push("/products?list=new")}
          variant="contained"
          size="small"
          startIcon={<AddRoundedIcon />}
          sx={{
            borderRadius: 999,
            textTransform: "none",
            fontWeight: 700,
            boxShadow: "none",
            ...brandContainedButtonSx,
          }}
        >
          New listing
        </Button>
      </Stack>

      {totalPendingPrivateAccess > 0 ? (
        <Alert
          severity="warning"
          icon={<LockRoundedIcon fontSize="inherit" />}
          sx={{ mb: 2, borderRadius: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              sx={{ fontWeight: 800, whiteSpace: "nowrap" }}
              onClick={() => {
                const first = activeListings.find(
                  (l) => countPendingPrivateAccessRequests(l) > 0,
                );
                if (first) setPrivateAccessListing(first);
              }}
            >
              Review
            </Button>
          }
        >
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {totalPendingPrivateAccess} private access request
            {totalPendingPrivateAccess === 1 ? "" : "s"} waiting for your review.
          </Typography>
        </Alert>
      ) : null}

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          mb: 4,
          width: "100%",
        }}
      >
        {listingsLoading && (
          <>
            {[0, 1, 2].map((i) => (
              <Skeleton
                key={i}
                variant="rounded"
                height={280}
                sx={{
                  borderRadius: 4,
                  width: {
                    xs: "100%",
                    sm: "calc((100% - 16px) / 2)",
                    md: "calc((100% - 32px) / 3)",
                  },
                }}
              />
            ))}
          </>
        )}

        {!listingsLoading && listingsError && (
          <Alert severity="error" sx={{ width: "100%", borderRadius: 3 }}>
            {listingsErrorObj?.message ?? "Failed to load your listings."}
          </Alert>
        )}

        {!listingsLoading &&
          !listingsError &&
          activeListings.length === 0 && (
            <Paper
              variant="outlined"
              sx={{
                borderRadius: 4,
                borderColor: "#ececec",
                borderStyle: "dashed",
                width: "100%",
                p: { xs: 4, md: 6 },
                textAlign: "center",
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 800 }} gutterBottom>
                You don&rsquo;t have any listings yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Your first 3 listings are on us — create one to start earning.
              </Typography>
              <Button
                onClick={() => router.push("/products?list=new")}
                variant="contained"
                startIcon={<AddRoundedIcon />}
                sx={{
                  borderRadius: 999,
                  textTransform: "none",
                  fontWeight: 700,
                  ...brandContainedButtonSx,
                }}
              >
                List your app
              </Button>
            </Paper>
          )}

        {!listingsLoading &&
          !listingsError &&
          activeListings.map((l) => {
            const cover =
              (l.photos && l.photos[l.coverIndex ?? 0]) ||
              l.photos?.[0] ||
              FALLBACK_COVER;
            const statusKey: ListingStatus = (l.status ??
              "pending_review") as ListingStatus;
            const categoryLabel =
              categoryLabels[l.category] ?? l.category;
            const listingPath = (() => {
              const mongoId = l._id ? String(l._id) : "";
              const slug = l.slug ? String(l.slug).trim() : "";
              if (slug && mongoId) {
                return `${encodeURIComponent(mongoId)}/${encodeURIComponent(slug)}`;
              }
              if (mongoId) return encodeURIComponent(mongoId);
              if (slug) return encodeURIComponent(slug);
              return "";
            })();
            const listingId = l._id ?? "";
            const pendingPrivateRequests = getPendingPrivateAccessRequests(l);
            const pendingPrivateCount = pendingPrivateRequests.length;

            return (
              <Paper
                key={listingId || l.appName}
                variant="outlined"
                sx={{
                  borderRadius: 4,
                  borderColor: "#ececec",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  minWidth: 0,
                  width: {
                    xs: "100%",
                    sm: "calc((100% - 16px) / 2)",
                    md: "calc((100% - 32px) / 3)",
                  },
                  transition: "transform .18s ease, box-shadow .18s ease",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "0 12px 28px -12px rgba(17,17,17,0.18)",
                  },
                }}
              >
                <Box
                  sx={{
                    height: 140,
                    backgroundImage: `url(${cover})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    position: "relative",
                  }}
                >
                  <Chip
                    size="small"
                    label={statusChipProps[statusKey]?.label ?? statusKey}
                    color={statusChipProps[statusKey]?.color ?? "default"}
                    sx={{
                      position: "absolute",
                      top: 10,
                      left: 10,
                      fontWeight: 700,
                      borderRadius: 2,
                      bgcolor: "#fff",
                      color: "#000",
                    }}
                  />
                  {l.buyItNowPrice ? (
                    <Chip
                      size="small"
                      label={`Buy now $${l.buyItNowPrice.toLocaleString()}`}
                      sx={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        fontWeight: 700,
                        borderRadius: 2,
                        bgcolor: "rgba(17,17,17,0.75)",
                        color: "#fff",
                      }}
                    />
                  ) : null}
                  {pendingPrivateCount > 0 ? (
                    <Chip
                      size="small"
                      icon={<LockRoundedIcon sx={{ fontSize: 14, color: "#fff !important" }} />}
                      label={`${pendingPrivateCount} access request${pendingPrivateCount === 1 ? "" : "s"}`}
                      color="warning"
                      onClick={() => setPrivateAccessListing(l)}
                      sx={{
                        position: "absolute",
                        bottom: 10,
                        right: 10,
                        fontWeight: 800,
                        cursor: "pointer",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                      }}
                    />
                  ) : null}
                </Box>

                <Box
                  sx={{ p: 2, flex: 1, display: "flex", flexDirection: "column" }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }} noWrap>
                    {l.appName}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                    noWrap
                  >
                    {l.tagline}
                  </Typography>

                  <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                    <Chip
                      size="small"
                      label={categoryLabel}
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                    {l.isPrivateListing ? (
                      <Chip
                        size="small"
                        label="Private"
                        color="warning"
                        variant="outlined"
                        sx={{ fontWeight: 700 }}
                      />
                    ) : null}
                    <Chip
                      icon={<VisibilityRoundedIcon sx={{ fontSize: 14 }} />}
                      size="small"
                      label={l.views?.toLocaleString() ?? "0"}
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                  </Stack>

                  {l.saleType === "auction" && (l.auctionPendingBidCount ?? 0) > 0 ? (
                    <Chip
                      size="small"
                      label={`${l.auctionPendingBidCount} bid(s) pending`}
                      color="warning"
                      onClick={() => setBidReviewListing(l)}
                      sx={{
                        mb: 1,
                        fontWeight: 800,
                        cursor: "pointer",
                        alignSelf: "flex-start",
                      }}
                    />
                  ) : null}

                  {l.isPrivateListing && pendingPrivateCount > 0 ? (
                    <Paper
                      variant="outlined"
                      sx={{
                        mb: 1.25,
                        p: 1.25,
                        borderRadius: 2,
                        borderColor: "warning.main",
                        bgcolor: "rgba(237, 108, 2, 0.06)",
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="warning.dark"
                        sx={{ fontWeight: 800, display: "block", mb: 0.75 }}
                      >
                        Private access requests ({pendingPrivateCount})
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                        {requesterLabel(pendingPrivateRequests[0])}
                        {pendingPrivateCount > 1
                          ? ` and ${pendingPrivateCount - 1} more`
                          : ""}{" "}
                        want access to this listing.
                      </Typography>
                      <Button
                        size="small"
                        variant="contained"
                        color="warning"
                        onClick={() => setPrivateAccessListing(l)}
                        sx={{
                          textTransform: "none",
                          fontWeight: 800,
                          borderRadius: 1.5,
                        }}
                      >
                        Review requests
                      </Button>
                    </Paper>
                  ) : null}

                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ mt: "auto", pt: 1 }}
                  >
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Starting price
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                        ${l.startingPrice?.toLocaleString() ?? "0"}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="View">
                        <IconButton
                          size="small"
                          onClick={() =>
                            listingPath &&
                            router.push(`/products/${listingPath}`)
                          }
                          disabled={!listingPath}
                        >
                          <VisibilityRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip
                        title={
                          l.sellerCanEdit === false
                            ? "Editing is disabled while there are bids or a purchase on this listing"
                            : "Edit listing"
                        }
                      >
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => {
                              if (!listingId || l.sellerCanEdit === false) return;
                              if (statusKey === "draft") {
                                router.push(
                                  `/products?list=new&draft=${encodeURIComponent(String(listingId))}`,
                                );
                                return;
                              }
                              router.push(
                                `/products?edit=${encodeURIComponent(String(listingId))}`,
                              );
                            }}
                            disabled={!listingId || l.sellerCanEdit === false}
                          >
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Open public page">
                        <IconButton
                          size="small"
                          component="a"
                          href={listingPath ? `/products/${listingPath}` : "#"}
                          target="_blank"
                          rel="noopener"
                          disabled={!listingPath}
                        >
                          <LaunchRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip
                        title={
                          statusKey === "removed"
                            ? "Already removed"
                            : "Remove listing from marketplace"
                        }
                      >
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setDeleteListingError(null);
                              setListingToDelete(l);
                            }}
                            disabled={!listingId || statusKey === "removed"}
                          >
                            <DeleteOutlineRoundedIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  </Stack>
                </Box>
              </Paper>
            );
          })}
      </Box>

      {soldListings.length > 0 ? (
        <>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 1.5, mt: 2 }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                Sold &amp; handover
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Open the exchange room to share branding files and close the sale with the buyer.
                Completed checkouts also appear under{" "}
                <Link
                  href={`/my-settings/${encodeURIComponent(String(user.id))}/order-history`}
                  style={{ fontWeight: 700, color: "inherit" }}
                >
                  Orders
                </Link>{" "}
                (header or sidebar).
              </Typography>
            </Box>
          </Stack>

          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 2,
              mb: 4,
              width: "100%",
            }}
          >
            {soldListings.map((l) => {
              const cover =
                (l.photos && l.photos[l.coverIndex ?? 0]) ||
                l.photos?.[0] ||
                FALLBACK_COVER;
              const mongoId = l._id ? String(l._id) : "";
              return (
                <Paper
                  key={mongoId || l.appName}
                  variant="outlined"
                  sx={{
                    borderRadius: 4,
                    borderColor: "#ececec",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    minWidth: 0,
                    width: {
                      xs: "100%",
                      sm: "calc((100% - 16px) / 2)",
                      md: "calc((100% - 32px) / 3)",
                    },
                  }}
                >
                  <Box
                    sx={{
                      height: 120,
                      backgroundImage: `url(${cover})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      position: "relative",
                    }}
                  >
                    <Chip
                      size="small"
                      label="Sold"
                      sx={{
                        position: "absolute",
                        top: 10,
                        left: 10,
                        fontWeight: 700,
                        borderRadius: 2,
                        bgcolor: "#fff",
                        color: "#000",
                      }}
                    />
                  </Box>
                  <Box sx={{ p: 2, flex: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }} noWrap>
                      {l.appName}
                    </Typography>
                    <Button
                      component={Link}
                      href={
                        mongoId
                          ? `/exchange/${encodeURIComponent(mongoId)}`
                          : "#"
                      }
                      variant="contained"
                      size="small"
                      startIcon={<TaskAltRoundedIcon />}
                      disabled={!mongoId}
                      sx={{
                        textTransform: "none",
                        fontWeight: 700,
                        borderRadius: 2,
                        ...brandContainedButtonSx,
                      }}
                    >
                      Success room
                    </Button>
                  </Box>
                </Paper>
              );
            })}
          </Box>
        </>
      ) : null}

        </>
      ) : null}

      <PrivateAccessRequestsModal
        open={Boolean(privateAccessListing)}
        listing={
          privateAccessListing?._id
            ? listings?.find(
                (row) => String(row._id) === String(privateAccessListing._id),
              ) ?? privateAccessListing
            : null
        }
        onClose={() => setPrivateAccessListing(null)}
        onResolve={(listingId, requestId, decision) => {
          void handleResolvePrivateAccess(listingId, requestId, decision);
        }}
        loadingKey={privateAccessLoadingKey}
      />

      <Dialog
        open={Boolean(bidReviewListing)}
        onClose={() => !bidActionLoading && setBidReviewListing(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ pr: 5 }}>
          Auction bids
          <IconButton
            aria-label="Close"
            onClick={() => !bidActionLoading && setBidReviewListing(null)}
            disabled={bidActionLoading}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseRoundedIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {bidReviewListing ? (
            <Stack spacing={2}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                {bidReviewListing.appName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pending bids need your decision. Rejected bids no longer count toward the auction
                price. Accepted bids do.
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Amount</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>When</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedAuctionBidsForDialog.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} sx={{ py: 3, color: "text.secondary" }}>
                          No bids on file.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedAuctionBidsForDialog.map((b) => (
                        <TableRow key={b._id}>
                          <TableCell sx={{ fontWeight: 700 }}>
                            ${Math.round(b.amount).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {b.createdAt
                              ? new Date(b.createdAt).toLocaleString()
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={b.bidStatus}
                              color={
                                b.bidStatus === "pending"
                                  ? "warning"
                                  : b.bidStatus === "accepted"
                                    ? "success"
                                    : "default"
                              }
                              sx={{ textTransform: "capitalize", fontWeight: 700 }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            {b.bidStatus === "pending" ? (
                              <Stack
                                direction="row"
                                spacing={1}
                                justifyContent="flex-end"
                              >
                                <Button
                                  size="small"
                                  color="success"
                                  variant="outlined"
                                  disabled={bidActionLoading}
                                  onClick={() => void handleResolveAuctionBid(b._id, "accepted")}
                                  sx={{ textTransform: "none", fontWeight: 700 }}
                                >
                                  Accept
                                </Button>
                                <Button
                                  size="small"
                                  color="error"
                                  variant="outlined"
                                  disabled={bidActionLoading}
                                  onClick={() => void handleResolveAuctionBid(b._id, "rejected")}
                                  sx={{ textTransform: "none", fontWeight: 700 }}
                                >
                                  Reject
                                </Button>
                              </Stack>
                            ) : (
                              <Typography variant="caption" color="text.secondary">
                                -
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setBidReviewListing(null)}
            disabled={bidActionLoading}
            sx={{ textTransform: "none" }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <DeleteListingConfirmModal
        open={Boolean(listingToDelete)}
        listingTitle={listingToDelete?.appName ?? ""}
        loading={deleteListingLoading}
        error={deleteListingError}
        onClose={() => {
          if (!deleteListingLoading) {
            setListingToDelete(null);
            setDeleteListingError(null);
          }
        }}
        onConfirm={() => void handleConfirmDeleteListing()}
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={5000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={toast.severity}
          onClose={() => setToast((t) => ({ ...t, open: false }))}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
