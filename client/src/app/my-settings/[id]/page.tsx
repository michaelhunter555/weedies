"use client";

import { useEffect, useMemo, useState } from "react";
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
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CreditCardRoundedIcon from "@mui/icons-material/CreditCardRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import LaunchRoundedIcon from "@mui/icons-material/LaunchRounded";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import MessageRoundedIcon from "@mui/icons-material/MessageRounded";
import PaidRoundedIcon from "@mui/icons-material/PaidRounded";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import { useMutation, useQuery } from "@tanstack/react-query";

import { useAuth } from "@/context/auth-context";
import { useListings } from "@/hooks/use-listings";
import {
  type StripePaymentMethod,
  useStripeWallet,
} from "@/hooks/use-stripe-wallet";
import type { Listing, ListingCategory } from "../../../../types";

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
  const { user, hydrated, logout } = useAuth();
  const { getMyListings } = useListings();
  const { getPaymentMethods, startSellerOnboarding } = useStripeWallet();

  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: "error" | "success" | "info";
  }>({ open: false, message: "", severity: "info" });

  // Route-guard: keep anyone who linked to /my-settings/<other-user> on
  // their own dashboard. We only do this once we're hydrated so the initial
  // SSR/CSR render matches.
  useEffect(() => {
    if (!hydrated || !user?.id) return;
    if (params?.id && params.id !== user.id) {
      router.replace(`/my-settings/${user.id}`);
    }
  }, [hydrated, user?.id, params?.id, router]);

  const hasConnectAccount = Boolean(user?.stripeConnectAccountId);
  const hasStripeCustomer = Boolean(user?.stripeCustomerId);
  const isStripeConnected =
    hasConnectAccount && Boolean(user?.isOnboarded);

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

  // ── Stripe Connect onboarding ───────────────────────────────────────────
  const onboardMutation = useMutation({
    mutationKey: ["stripe-seller-onboard", user?.id],
    mutationFn: () =>
      startSellerOnboarding({ hasExistingAccount: hasConnectAccount }),
    onSuccess: (url) => {
      if (url) {
        window.location.href = url;
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

  // ── Derived stats ───────────────────────────────────────────────────────
  const totalListingsCount =
    user?.totalListings ?? (listings?.length ?? 0);
  const salesCount = user?.totalListingsSold ?? user?.totalSales ?? 0;
  // Messages aren't persisted yet — keep a stable placeholder count so the
  // UI doesn't lie about data it doesn't have.
  const unreadMessages = 0;
  const totalMessages = 0;

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
        tint: "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)",
      },
      {
        id: "sales" as const,
        label: "Sales",
        value: String(salesCount),
        delta: salesCount
          ? `Lifetime apps sold`
          : "Your first sale is on its way",
        icon: <TrendingUpRoundedIcon />,
        tint: "linear-gradient(135deg, #10b981 0%, #22d3ee 100%)",
      },
      {
        id: "messages" as const,
        label: "Messages",
        value: String(unreadMessages),
        delta: totalMessages ? `${totalMessages} total` : "Inbox coming soon",
        icon: <MessageRoundedIcon />,
        tint: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
      },
    ],
    [totalListingsCount, salesCount, activeListings.length],
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

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      {/* Top bar — support + Stripe summary */}
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
                bgcolor: "transparent",
                background:
                  "linear-gradient(135deg, #7c3aed 0%, #ec4899 60%, #f59e0b 100%)",
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
                  background:
                    "linear-gradient(135deg, #635bff 0%, #0a2540 100%)",
                  "&:hover": { boxShadow: "0 6px 16px rgba(99,91,255,0.35)" },
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
          You can&rsquo;t receive payouts until Stripe onboarding is complete.
          Takes about 2 minutes.
        </Alert>
      )}

      {/* Row 1 — stat cards */}
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
                  background: s.tint,
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

      {/* Row 2 — Integrations (Stripe onboarding) + Payment options */}
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
                      ? "Onboarding started — finish verification to enable payouts."
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
                    background:
                      "linear-gradient(135deg, #635bff 0%, #0a2540 100%)",
                    "&:hover": {
                      boxShadow: "0 6px 16px rgba(99,91,255,0.35)",
                    },
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

      {/* Row 3 — Active listings */}
      <Stack
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
            background: "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)",
            "&:hover": { boxShadow: "0 6px 16px rgba(124,58,237,0.35)" },
          }}
        >
          New listing
        </Button>
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
                Your first listing is on us — create one to start earning.
              </Typography>
              <Button
                onClick={() => router.push("/products?list=new")}
                variant="contained"
                startIcon={<AddRoundedIcon />}
                sx={{
                  borderRadius: 999,
                  textTransform: "none",
                  fontWeight: 700,
                  background:
                    "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)",
                }}
              >
                Create first listing
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
            const listingId = l._id ?? "";

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
                    <Chip
                      icon={<VisibilityRoundedIcon sx={{ fontSize: 14 }} />}
                      size="small"
                      label={l.views?.toLocaleString() ?? "0"}
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                  </Stack>

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
                            listingId &&
                            router.push(`/products/${listingId}`)
                          }
                          disabled={!listingId}
                        >
                          <VisibilityRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() =>
                            listingId &&
                            router.push(`/products/${listingId}/edit`)
                          }
                          disabled={!listingId}
                        >
                          <EditRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Open public page">
                        <IconButton
                          size="small"
                          component="a"
                          href={listingId ? `/products/${listingId}` : "#"}
                          target="_blank"
                          rel="noopener"
                          disabled={!listingId}
                        >
                          <LaunchRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                </Box>
              </Paper>
            );
          })}
      </Box>

      {/* Row 4 — Messages table */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 1.5 }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            Messages
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Buyers asking about your listings.
          </Typography>
        </Box>
        <Button
          component={Link}
          href="/messages"
          variant="text"
          size="small"
          endIcon={<MailOutlineRoundedIcon />}
          sx={{ textTransform: "none", fontWeight: 700 }}
          // disabled
        >
          Inbox coming soon
        </Button>
      </Stack>

      <Paper
        variant="outlined"
        sx={{
          borderRadius: 4,
          borderColor: "#ececec",
          overflow: "hidden",
          mb: 6,
        }}
      >
        <TableContainer>
          <Table size="medium">
            <TableHead sx={{ bgcolor: "#fafafa" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>From</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Subject</TableCell>
                <TableCell
                  sx={{
                    fontWeight: 800,
                    display: { xs: "none", md: "table-cell" },
                  }}
                >
                  Listing
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 800,
                    display: { xs: "none", sm: "table-cell" },
                  }}
                >
                  Received
                </TableCell>
                <TableCell sx={{ fontWeight: 800 }} align="right">
                  Status
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell colSpan={5} sx={{ py: 6, textAlign: "center" }}>
                  <Typography variant="body2" color="text.secondary">
                    No messages yet. Once a buyer reaches out about one of your
                    listings it will show up here.
                  </Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

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
