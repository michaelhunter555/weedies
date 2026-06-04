"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/context/auth-context";
import { useListings } from "@/hooks/use-listings";
import { brandContainedButtonSx } from "@/theme/brand-palette";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import LaunchRoundedIcon from "@mui/icons-material/LaunchRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Pagination,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";

import type { Listing } from "../../../../../types";
import { getCategoryLabel } from "@/utils/listingOptions";

const PAGE_SIZE = 20;
const FALLBACK_COVER = "/3.jpg";

const statusChip: Record<
  string,
  { label: string; color: "success" | "warning" | "default" | "error" }
> = {
  live: { label: "Live", color: "success" },
  reserved: { label: "Reserved", color: "warning" },
  pending_listing_fee: { label: "Payment due", color: "warning" },
  pending_review: { label: "In review", color: "warning" },
  draft: { label: "Draft", color: "default" },
  rejected: { label: "Rejected", color: "error" },
  sold: { label: "Sold", color: "default" },
  paused: { label: "Paused", color: "default" },
  expired: { label: "Expired", color: "default" },
  removed: { label: "Removed", color: "default" },
};

function listingHref(l: Listing): string {
  const mongoId = l._id ? String(l._id) : "";
  const slug = l.slug ? String(l.slug).trim() : "";
  if (slug && mongoId) {
    return `/products/${encodeURIComponent(mongoId)}/${encodeURIComponent(slug)}`;
  }
  if (mongoId) return `/products/${encodeURIComponent(mongoId)}`;
  return "/products";
}

/** Listing prices are stored in whole dollars (same as dashboard / checkout). */
function listingPriceLabel(l: Listing): { amount: string; suffix: string } {
  const currency = (l.currency ?? "USD").toUpperCase();
  const format = (dollars: number) => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(dollars);
    } catch {
      return `$${dollars.toLocaleString()}`;
    }
  };

  if (l.saleType === "auction") {
    const hasBid =
      l.auctionCurrentPrice != null && Number(l.auctionCurrentPrice) > 0;
    const dollars = Number(
      hasBid ? l.auctionCurrentPrice : l.startingPrice ?? 0,
    );
    return {
      amount: format(dollars),
      suffix: hasBid ? " current bid" : " starting",
    };
  }

  const dollars = Number(l.buyItNowPrice ?? l.startingPrice ?? 0);
  return { amount: format(dollars), suffix: "" };
}

export default function MyListingsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, hydrated } = useAuth();
  const { getMyListings, relistListing } = useListings();
  const queryClient = useQueryClient();

  const tabParam = searchParams.get("tab");
  const tab: "active" | "sold" | "expired" =
    tabParam === "sold"
      ? "sold"
      : tabParam === "expired"
        ? "expired"
        : "active";
  const [page, setPage] = useState(1);
  const [relistError, setRelistError] = useState<string | null>(null);
  const [relistingId, setRelistingId] = useState<string | null>(null);

  const routeUserId = params?.id ? decodeURIComponent(String(params.id)).trim() : "";
  const sessionUserId = user?.id ? String(user.id).trim() : "";
  const settingsBase = sessionUserId
    ? `/my-settings/${encodeURIComponent(sessionUserId)}`
    : "";

  const status = tab === "sold" ? "sold" : "active";

  const listingsQuery = useQuery({
    queryKey: ["my-listings", sessionUserId, status, page, PAGE_SIZE],
    queryFn: () => getMyListings({ page, limit: PAGE_SIZE, status }),
    enabled: Boolean(hydrated && sessionUserId),
    staleTime: 30_000,
  });

  const items = listingsQuery.data?.items ?? [];
  const total = listingsQuery.data?.total ?? 0;
  const totalPages = listingsQuery.data?.totalPages ?? 1;

  const tabCounts = useMemo(
    () => ({
      active: listingsQuery.data?.meta?.totalActive ?? 0,
      sold: listingsQuery.data?.meta?.totalSold ?? 0,
      expired: listingsQuery.data?.meta?.totalExpired ?? 0,
    }),
    [listingsQuery.data?.meta],
  );

  const relistMutation = useMutation({
    mutationFn: (listingId: string) => relistListing(listingId),
    onMutate: (listingId) => {
      setRelistingId(listingId);
      setRelistError(null);
    },
    onSuccess: async (data, listingId) => {
      await queryClient.invalidateQueries({ queryKey: ["my-listings", sessionUserId] });
      if (data?.listingFeeCheckoutUrl) {
        window.location.assign(data.listingFeeCheckoutUrl);
        return;
      }
      router.push(
        `/products?list=edit&listingId=${encodeURIComponent(listingId)}`,
      );
    },
    onError: (e: Error) => setRelistError(e.message),
    onSettled: () => setRelistingId(null),
  });

  useEffect(() => {
    setPage(1);
  }, [tab]);

  const handleTabChange = (_: React.SyntheticEvent, next: string) => {
    const nextTab =
      next === "sold" ? "sold" : next === "expired" ? "expired" : "active";
    setPage(1);
    const qs =
      nextTab === "active" ? "" : `?tab=${encodeURIComponent(nextTab)}`;
    router.replace(`${settingsBase}/listings${qs}`);
  };

  if (!hydrated) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!user) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Log in to manage your listings.
        </Alert>
        <Button component={Link} href="/signup" variant="contained" sx={{ textTransform: "none" }}>
          Sign in
        </Button>
      </Container>
    );
  }

  if (routeUserId && sessionUserId && routeUserId !== sessionUserId) {
    const correct = `${settingsBase}/listings`;
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Listings are tied to your signed-in account.
        </Alert>
        <Button component={Link} href={correct} variant="contained" sx={{ textTransform: "none" }}>
          Go to my listings
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 3 } }}>
      <Stack spacing={2}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={1}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>
              My listings
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {PAGE_SIZE} per page. Edit live listings from your dashboard or open the product page.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              component={Link}
              href={settingsBase}
              variant="outlined"
              size="small"
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              Back to overview
            </Button>
            <Button
              onClick={() => router.push("/products?list=new")}
              variant="contained"
              size="small"
              startIcon={<AddRoundedIcon />}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                boxShadow: "none",
                ...brandContainedButtonSx,
              }}
            >
              New listing
            </Button>
          </Stack>
        </Stack>

        <Tabs
          value={tab}
          onChange={handleTabChange}
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Tab
            value="active"
            label={`Active (${tabCounts.active})`}
            sx={{ textTransform: "none", fontWeight: 700 }}
          />
          <Tab
            value="sold"
            label={`Sold (${tabCounts.sold})`}
            sx={{ textTransform: "none", fontWeight: 700 }}
          />
          <Tab
            value="expired"
            label={`Expired (${tabCounts.expired})`}
            sx={{ textTransform: "none", fontWeight: 700 }}
          />
        </Tabs>

        {tab === "expired" ? (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            These listings did not sell. Relist reuses the same listing ID and
            charges the listing fee again (not a free edit). Inactive expired
            listings are removed after 30 days.
          </Alert>
        ) : null}

        {relistError ? (
          <Alert severity="error" onClose={() => setRelistError(null)}>
            {relistError}
          </Alert>
        ) : null}

        {listingsQuery.isLoading ? (
          <Stack alignItems="center" py={6}>
            <CircularProgress />
          </Stack>
        ) : null}

        {listingsQuery.isError ? (
          <Alert severity="error">
            {listingsQuery.error instanceof Error
              ? listingsQuery.error.message
              : "Failed to load listings."}
          </Alert>
        ) : null}

        {!listingsQuery.isLoading && !listingsQuery.isError && items.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 4, borderRadius: 3, borderColor: "#ececec" }}>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>
              {tab === "sold"
                ? "No sold listings yet."
                : tab === "expired"
                  ? "No expired listings."
                  : "No active listings."}
            </Typography>
            {tab === "active" ? (
              <Button
                onClick={() => router.push("/products?list=new")}
                variant="contained"
                sx={{ mt: 2, textTransform: "none", fontWeight: 700, ...brandContainedButtonSx }}
              >
                Create a listing
              </Button>
            ) : null}
          </Paper>
        ) : null}

        {!listingsQuery.isLoading && !listingsQuery.isError
          ? items.map((l) => {
              const cover =
                (l.photos && l.photos[l.coverIndex ?? 0]) || l.photos?.[0] || FALLBACK_COVER;
              const st = String(l.status ?? "draft");
              const chip = statusChip[st] ?? { label: st, color: "default" as const };
              const categoryLabel = getCategoryLabel(l.category);
              const productHref = listingHref(l);
              const editHref = l._id
                ? `/products?list=edit&listingId=${encodeURIComponent(String(l._id))}`
                : "/products?list=new";
              const priceLabel = listingPriceLabel(l);

              return (
                <Paper
                  key={String(l._id)}
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    borderColor: "#ececec",
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    gap: 2,
                    alignItems: { sm: "center" },
                  }}
                >
                  <Box
                    sx={{
                      width: { xs: "100%", sm: 88 },
                      height: 88,
                      borderRadius: 2,
                      backgroundImage: `url(${cover})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      flexShrink: 0,
                    }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                        {l.appName}
                      </Typography>
                      <Chip size="small" label={chip.label} color={chip.color} />
                      <Chip size="small" label={categoryLabel} variant="outlined" />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {l.tagline || "No tagline"}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800, mt: 0.5 }}>
                      {priceLabel.amount}
                      {priceLabel.suffix}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} flexShrink={0} flexWrap="wrap" useFlexGap>
                    {tab === "active" ? (
                      <Button
                        component={Link}
                        href={editHref}
                        size="small"
                        variant="outlined"
                        sx={{ textTransform: "none", fontWeight: 700 }}
                      >
                        Edit
                      </Button>
                    ) : null}
                    <Button
                      component={Link}
                      href={productHref}
                      size="small"
                      variant="outlined"
                      endIcon={<LaunchRoundedIcon sx={{ fontSize: 16 }} />}
                      sx={{ textTransform: "none", fontWeight: 700 }}
                    >
                      View
                    </Button>
                    {tab === "sold" && l._id ? (
                      <Button
                        component={Link}
                        href={`/exchange/${encodeURIComponent(String(l._id))}`}
                        size="small"
                        variant="contained"
                        sx={{
                          textTransform: "none",
                          fontWeight: 700,
                          boxShadow: "none",
                          ...brandContainedButtonSx,
                        }}
                      >
                        Exchange
                      </Button>
                    ) : null}
                    {tab === "expired" && l._id ? (
                      <Button
                        size="small"
                        variant="contained"
                        disabled={relistMutation.isPending}
                        onClick={() => relistMutation.mutate(String(l._id))}
                        sx={{
                          textTransform: "none",
                          fontWeight: 700,
                          boxShadow: "none",
                          ...brandContainedButtonSx,
                        }}
                      >
                        {relistingId === String(l._id) && relistMutation.isPending
                          ? "Relisting…"
                          : "Relist"}
                      </Button>
                    ) : null}
                  </Stack>
                </Paper>
              );
            })
          : null}

        {!listingsQuery.isLoading && totalPages > 1 ? (
          <Stack alignItems="center" sx={{ pt: 1 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, next) => setPage(next)}
              color="primary"
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              Page {page} of {totalPages} ({total} listing{total === 1 ? "" : "s"})
            </Typography>
          </Stack>
        ) : null}
      </Stack>
    </Container>
  );
}
