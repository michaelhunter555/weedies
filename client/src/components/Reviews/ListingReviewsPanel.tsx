"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Avatar,
  Box,
  Chip,
  Paper,
  Rating,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";

import { useApiFetchOrThrow } from "@/hooks/use-api-fetch";

type ListingReviewRow = {
  _id: string;
  rating: number | null;
  comment: string;
  purchaseDate: string | null;
  datePosted: string | null;
  reviewer: { id: string; name: string } | null;
};

type ListingReviewsResponse = {
  ok?: boolean;
  reviews: ListingReviewRow[];
  total: number;
  page: number;
  totalPages: number;
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function initial(name?: string): string {
  return (name?.trim().charAt(0) || "?").toUpperCase();
}

export type ListingReviewsPanelProps = {
  listingId: string | null | undefined;
  /** Hide the section entirely when there are no reviews yet. */
  hideWhenEmpty?: boolean;
  title?: string;
};

/**
 * Real (non-dummy) buyer reviews persisted on the `Review` collection.
 * Fetched from `GET /api/listings/:id/reviews` and works for anonymous viewers.
 */
export function ListingReviewsPanel({
  listingId,
  hideWhenEmpty,
  title = "Buyer review",
}: ListingReviewsPanelProps) {
  const { apiFetch } = useApiFetchOrThrow();

  const lid = listingId ? String(listingId) : "";

  const q = useQuery<ListingReviewsResponse>({
    queryKey: ["listing-reviews", lid],
    queryFn: () =>
      apiFetch<ListingReviewsResponse>(
        `/listings/${encodeURIComponent(lid)}/reviews?page=1&limit=20`,
        "GET",
      ),
    enabled: Boolean(lid),
    staleTime: 30_000,
  });

  if (!lid) return null;

  if (q.isLoading) {
    return (
      <Box>
        <Typography variant="overline" color="text.secondary" fontWeight={700}>
          {title}
        </Typography>
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          <Skeleton variant="rounded" height={88} />
          <Skeleton variant="rounded" height={88} />
        </Stack>
      </Box>
    );
  }

  const reviews = q.data?.reviews ?? [];
  if (!reviews.length) {
    if (hideWhenEmpty) return null;
    return (
      <Box>
        <Typography variant="overline" color="text.secondary" fontWeight={700}>
          {title}
        </Typography>
        <Paper
          variant="outlined"
          sx={{ p: 2, borderRadius: 2, mt: 1, borderStyle: "dashed" }}
        >
          <Typography variant="body2" color="text.secondary">
            An optional review from the future buyer may appear here post sale.
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="baseline"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={1}
      >
        <Typography variant="overline" color="text.secondary" fontWeight={700}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {q.data?.total ?? reviews.length} total
        </Typography>
      </Stack>

      <Stack spacing={1.5} sx={{ mt: 1 }}>
        {reviews.map((r) => {
          const name = r.reviewer?.name ?? "Verified buyer";
          return (
            <Paper key={r._id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Stack spacing={1}>
                <Stack
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  flexWrap="wrap"
                >
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: "secondary.main",
                      fontSize: 13,
                    }}
                  >
                    {initial(name)}
                  </Avatar>
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    flexWrap="wrap"
                  >
                    <Typography fontWeight={700}>{name}</Typography>
                    <Chip
                      size="small"
                      color="success"
                      variant="outlined"
                      icon={<VerifiedRoundedIcon sx={{ fontSize: 14 }} />}
                      label="Verified buyer"
                      sx={{ fontSize: 11 }}
                    />
                  </Stack>
                  {r.datePosted ? (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ ml: "auto" }}
                    >
                      {formatDate(r.datePosted)}
                    </Typography>
                  ) : null}
                </Stack>
                {typeof r.rating === "number" ? (
                  <Rating value={r.rating} readOnly size="small" precision={1} />
                ) : null}
                {r.comment ? (
                  <Typography variant="body2" color="text.secondary">
                    {r.comment}
                  </Typography>
                ) : null}
              </Stack>
            </Paper>
          );
        })}
      </Stack>
    </Box>
  );
}
