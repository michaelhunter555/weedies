"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  fetchAdminListingById,
  patchListingReview,
  type ListingReviewAction,
} from "@/lib/admin-api";
import { ListingReviewContextPanels } from "@/components/admin/ListingReviewContextPanels";
import { RejectListingDialog } from "@/components/admin/RejectListingDialog";
import { AppDescriptionHtml } from "@/components/listings/AppDescriptionHtml";
import { useAdminAuth } from "@/context/admin-auth-context";

function str(v: unknown): string {
  return typeof v === "string" ? v : v != null ? String(v) : "";
}

function sellerBlock(listing: Record<string, unknown>) {
  const s = listing.sellerId;
  if (s && typeof s === "object") {
    const o = s as { name?: string; email?: string; _id?: string };
    return {
      id: o._id ? String(o._id) : "",
      name: str(o.name) || "Seller",
      email: str(o.email),
    };
  }
  return { id: str(s), name: "Seller", email: "" };
}

function coverPhotos(listing: Record<string, unknown>): string[] {
  const photos = listing.photos;
  if (!Array.isArray(photos)) return [];
  return photos.filter((p): p is string => typeof p === "string" && p.length > 0);
}

export default function AdminListingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const listingId = decodeURIComponent(params?.id ?? "").trim();
  const { accessToken, hydrated } = useAdminAuth();
  const queryClient = useQueryClient();
  const [busy, setBusy] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = React.useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-listing", listingId],
    queryFn: () => fetchAdminListingById(listingId),
    enabled: hydrated && !!accessToken && !!listingId,
  });

  const listing = data?.listing;
  const reviewContext = data?.reviewContext;

  const runReview = async (action: ListingReviewAction) => {
    if (!listingId) return;
    setActionError(null);
    setBusy(true);
    try {
      await patchListingReview(listingId, action);
      await queryClient.invalidateQueries({ queryKey: ["admin-listing", listingId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
      if (action === "approve" || action === "reject") {
        router.push("/admin/listings");
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  const confirmReject = async (rejectionReason: string) => {
    if (!listingId) return;
    setActionError(null);
    setBusy(true);
    try {
      await patchListingReview(listingId, "reject", {
        rejectionReason: rejectionReason || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-listing", listingId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
      setRejectOpen(false);
      router.push("/admin/listings");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  if (!listingId) {
    return <Alert severity="warning">Missing listing id.</Alert>;
  }

  if (!hydrated || isLoading) {
    return (
      <Box sx={{ py: 8, textAlign: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!accessToken) {
    return <Alert severity="info">Sign in to review listings.</Alert>;
  }

  if (isError || !listing) {
    return (
      <Alert severity="error">
        {error instanceof Error ? error.message : "Listing not found."}
      </Alert>
    );
  }

  const seller = sellerBlock(listing);
  const photos = coverPhotos(listing);
  const coverIndex =
    typeof listing.coverIndex === "number" ? listing.coverIndex : 0;
  const status = str(listing.status);
  const pendingLike = ["draft", "pending_review", "paused", "rejected"].includes(
    status,
  );
  const storefrontOrigin =
    process.env.NEXT_PUBLIC_STOREFRONT_ORIGIN?.replace(/\/$/, "") ||
    "http://localhost:3000";
  const slug = str(listing.slug);
  const publicUrl =
    slug && listingId
      ? `${storefrontOrigin}/products/${encodeURIComponent(listingId)}/${encodeURIComponent(slug)}`
      : `${storefrontOrigin}/products/${encodeURIComponent(listingId)}`;

  const infoRows: { label: string; value: React.ReactNode }[] = [
    { label: "Status", value: <Chip size="small" label={status} /> },
    { label: "Sale type", value: str(listing.saleType) },
    { label: "Category", value: str(listing.category) },
    {
      label: "Price",
      value:
        listing.saleType === "auction"
          ? `Starting $${Number(listing.startingPrice ?? 0)} · Current $${Number(listing.auctionCurrentPrice ?? listing.startingPrice ?? 0)}`
          : `Buy now $${Number(listing.buyItNowPrice ?? listing.startingPrice ?? 0)}`,
    },
    { label: "Seller", value: `${seller.name}${seller.email ? ` · ${seller.email}` : ""}` },
    { label: "Slug", value: slug || "—" },
    {
      label: "Verification",
      value: [
        listing.isListingVerified ? "Listing verified" : "Listing not verified",
        listing.isAnalyticsVerified ? "Analytics verified" : null,
        listing.hasSalesToVerify ? "Sales to verify" : null,
      ]
        .filter(Boolean)
        .join(" · ") || "—",
    },
    {
      label: "Created",
      value: listing.createdAt
        ? new Date(String(listing.createdAt)).toLocaleString()
        : "—",
    },
    {
      label: "Published",
      value: listing.publishedAt
        ? new Date(String(listing.publishedAt)).toLocaleString()
        : "—",
    },
  ];

  if (listing.rejectionReason) {
    infoRows.push({
      label: "Rejection reason",
      value: str(listing.rejectionReason),
    });
  }

  const demoUrl = str(listing.demoUrl);
  const liveUrl = str(listing.liveUrl);
  const repoUrl = str(listing.repoUrl);
  const hasListingLinks = !!(demoUrl || liveUrl || repoUrl);

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 960 }}>
      <Button
        component={Link}
        href="/admin/listings"
        startIcon={<ArrowBackIcon />}
        sx={{ alignSelf: "flex-start", textTransform: "none" }}
      >
        Back to listings
      </Button>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            {str(listing.appName) || "Listing"}
          </Typography>
          {listing.tagline ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {str(listing.tagline)}
            </Typography>
          ) : null}
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {listing.isPlatformListing === true ? (
            <Button
              component={Link}
              href={`/admin/platform-listings/${encodeURIComponent(listingId)}/edit`}
              variant="contained"
              sx={{ textTransform: "none" }}
            >
              Edit platform listing
            </Button>
          ) : null}
          <Button
            component="a"
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="outlined"
            endIcon={<OpenInNewIcon />}
            sx={{ textTransform: "none" }}
          >
            View on storefront
          </Button>
          {pendingLike ? (
            <>
              <Button
                variant="contained"
                color="success"
                disabled={busy}
                onClick={() => void runReview("approve")}
                sx={{ textTransform: "none" }}
              >
                Approve
              </Button>
              <Button
                variant="outlined"
                color="error"
                disabled={busy}
                onClick={() => setRejectOpen(true)}
                sx={{ textTransform: "none" }}
              >
                Reject
              </Button>
            </>
          ) : status === "live" ? (
            <Button
              variant="outlined"
              color="warning"
              disabled={busy}
              onClick={() => void runReview("unpublish")}
              sx={{ textTransform: "none" }}
            >
              Take down
            </Button>
          ) : null}
        </Stack>
      </Stack>

      {actionError ? (
        <Alert severity="error" onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      ) : null}

      {photos.length > 0 ? (
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {photos.map((url, i) => (
            <Box
              key={url}
              component="img"
              src={url}
              alt=""
              sx={{
                width: 140,
                height: 140,
                objectFit: "cover",
                borderRadius: 2,
                border: 2,
                borderColor: i === coverIndex ? "primary.main" : "divider",
              }}
            />
          ))}
        </Stack>
      ) : null}

      <ListingReviewContextPanels reviewContext={reviewContext} />

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          Details
        </Typography>
        <Stack spacing={1.25} divider={<Divider flexItem />}>
          {infoRows.map((row) => (
            <Stack
              key={row.label}
              direction={{ xs: "column", sm: "row" }}
              spacing={0.5}
            >
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ minWidth: 140, fontWeight: 600 }}
              >
                {row.label}
              </Typography>
              <Typography variant="body2" component="div">
                {row.value}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          Description
        </Typography>
        <AppDescriptionHtml html={str(listing.appDescription)} variant="body2" />
      </Paper>

      {hasListingLinks ? (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            Links
          </Typography>
          <Stack spacing={0.75}>
            {demoUrl ? (
              <Typography variant="body2">
                Demo:{" "}
                <a href={demoUrl} target="_blank" rel="noreferrer">
                  {demoUrl}
                </a>
              </Typography>
            ) : null}
            {liveUrl ? (
              <Typography variant="body2">
                Live:{" "}
                <a href={liveUrl} target="_blank" rel="noreferrer">
                  {liveUrl}
                </a>
              </Typography>
            ) : null}
            {repoUrl ? (
              <Typography variant="body2">
                Repo:{" "}
                <a href={repoUrl} target="_blank" rel="noreferrer">
                  {repoUrl}
                </a>
              </Typography>
            ) : null}
          </Stack>
        </Paper>
      ) : null}

      {listing.saleType === "auction" && Array.isArray(listing.auctionBids) ? (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            Auction bids ({listing.auctionBids.length})
          </Typography>
          <Stack spacing={1}>
            {(listing.auctionBids as Record<string, unknown>[]).map((b, i) => (
              <Typography key={i} variant="body2">
                ${Number(b.amount ?? 0)} · {str(b.bidStatus)} ·{" "}
                {b.createdAt
                  ? new Date(String(b.createdAt)).toLocaleString()
                  : "—"}
              </Typography>
            ))}
          </Stack>
        </Paper>
      ) : null}

      <RejectListingDialog
        open={rejectOpen}
        listingName={str(listing.appName)}
        busy={busy}
        onClose={() => {
          if (!busy) setRejectOpen(false);
        }}
        onConfirm={(reason) => void confirmReject(reason)}
      />
    </Stack>
  );
}
