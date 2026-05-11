"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid2,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";

import ProductCard from "../Products/ProductCard";
import { useListings } from "@/hooks/use-listings";
import type { Listing } from "../../../types";

interface IProductCollection {
  collectionName: string;
  category?: string;
  subtitle?: string;
  count?: number;
  /** Text search passed through from the page-level search box. */
  q?: string;
  /** When true, an empty result renders a CTA to submit the first listing. */
  showAddCTA?: boolean;
}

type SortKey = "trending" | "new" | "free" | "pro" | "lowest-price" | "top-rated";

const filters: { label: string; value: SortKey }[] = [
  { label: "Trending", value: "trending" },
  { label: "New", value: "new" },
  { label: "Free", value: "free" },
  { label: "Pro", value: "pro" },
  { label: "Lowest price", value: "lowest-price" },
  { label: "Top rated", value: "top-rated" },
];

/**
 * Client-side refinement of the already-fetched page. Keeps the server fetch
 * simple (newest-first) and lets users re-sort without new network calls.
 */
function applySort(items: Listing[], key: SortKey): Listing[] {
  const arr = items.slice();
  switch (key) {
    case "new":
      return arr.sort((a, b) => {
        const ad = new Date(a.publishedAt || a.createdAt || 0).getTime();
        const bd = new Date(b.publishedAt || b.createdAt || 0).getTime();
        return bd - ad;
      });
    case "free":
      return arr.filter((l) => Number(l.startingPrice ?? 0) === 0);
    case "pro":
      return arr.filter((l) => Number(l.startingPrice ?? 0) > 0);
    case "lowest-price":
      return arr.sort(
        (a, b) => Number(a.startingPrice ?? 0) - Number(b.startingPrice ?? 0),
      );
    case "top-rated":
      return arr.sort(
        (a, b) => Number(b.averageRating ?? 0) - Number(a.averageRating ?? 0),
      );
    case "trending":
    default:
      return arr.sort(
        (a, b) => Number(b.views ?? 0) - Number(a.views ?? 0),
      );
  }
}

const Collection = ({
  collectionName,
  category,
  subtitle,
  count = 12,
  q,
  showAddCTA = false,
}: IProductCollection) => {
  const router = useRouter();
  const [active, setActive] = useState<SortKey>("trending");
  const { getAllListings } = useListings();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["listings-feed", category || "all", q || "", count],
    queryFn: () =>
      getAllListings({
        category: category || undefined,
        q: q || undefined,
        page: 1,
        limit: count,
      }),
    staleTime: 30_000,
  });

  const sortedItems = useMemo(() => {
    if (!data?.items) return [] as Listing[];
    return applySort(data.items, active);
  }, [data, active]);

  const total = data?.total ?? 0;
  const isEmpty = !isLoading && !isError && sortedItems.length === 0;

  return (
    <Stack sx={{ marginTop: 2 }} spacing={2}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "flex-end" }}
        spacing={1}
      >
        <Stack>
          <Typography component="h2" variant="h5" sx={{ fontWeight: 800 }}>
            {collectionName}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Stack>
        <Stack
          direction="row"
          spacing={1}
          sx={{ flexWrap: "wrap", gap: 1, rowGap: 1 }}
        >
          {filters.map((f) => (
            <Chip
              key={f.value}
              size="small"
              clickable
              label={f.label}
              onClick={() => setActive(f.value)}
              color={active === f.value ? "secondary" : "default"}
              variant={active === f.value ? "filled" : "outlined"}
              sx={{ fontWeight: 600 }}
            />
          ))}
        </Stack>
      </Stack>

      {isError && (
        <Alert
          severity="error"
          sx={{ borderRadius: 2 }}
          action={
            <Button
              size="small"
              color="inherit"
              onClick={() => {
                refetch();
              }}
            >
              Retry
            </Button>
          }
        >
          {error instanceof Error
            ? error.message
            : "Couldn't load listings right now."}
        </Alert>
      )}

      {isLoading && (
        <Grid2 container spacing={2}>
          {Array.from({ length: Math.min(count, 8) }).map((_, index) => (
            <Grid2
              key={`skeleton-${index}`}
              size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
            >
              <Paper
                variant="outlined"
                sx={{
                  borderRadius: 3,
                  overflow: "hidden",
                  borderColor: "#ececec",
                }}
              >
                <Skeleton
                  variant="rectangular"
                  height={160}
                  animation="wave"
                />
                <Box sx={{ p: 2 }}>
                  <Skeleton
                    variant="text"
                    height={18}
                    width="85%"
                    animation="wave"
                  />
                  <Skeleton
                    variant="text"
                    height={18}
                    width="60%"
                    animation="wave"
                  />
                  <Skeleton
                    variant="text"
                    height={30}
                    width="40%"
                    animation="wave"
                    sx={{ mt: 1 }}
                  />
                </Box>
              </Paper>
            </Grid2>
          ))}
        </Grid2>
      )}

      {!isLoading && !isError && sortedItems.length > 0 && (
        <Grid2 container spacing={2}>
          {sortedItems.map((listing) => (
            <Grid2
              key={listing._id || `${listing.appName}-${listing.createdAt}`}
              size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
            >
              <ProductCard listing={listing} />
            </Grid2>
          ))}
        </Grid2>
      )}

      {isEmpty && (
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 3,
            borderStyle: "dashed",
            borderColor: "#e5e7eb",
            p: { xs: 4, md: 6 },
            textAlign: "center",
            background:
              "linear-gradient(135deg, rgba(124,58,237,0.04) 0%, rgba(236,72,153,0.04) 100%)",
          }}
        >
          <Stack spacing={2} alignItems="center">
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                bgcolor: "rgba(124,58,237,0.12)",
                color: "#7c3aed",
              }}
            >
              <AutoAwesomeRoundedIcon />
            </Box>
            <Stack spacing={0.5} alignItems="center">
              <Typography variant="h6" fontWeight={800}>
                No apps here yet
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ maxWidth: 420 }}
              >
                {q
                  ? `We couldn't find anything matching “${q}”. Try a different search or check back soon.`
                  : category
                    ? "This category is wide open. Be the first to list an app here."
                    : "The marketplace is just getting started. Be the first to ship."}
              </Typography>
            </Stack>
            {showAddCTA && (
              <Button
                variant="contained"
                startIcon={<AddRoundedIcon />}
                onClick={() => router.push("/products?list=new")}
                sx={{
                  borderRadius: 999,
                  textTransform: "none",
                  fontWeight: 700,
                  background:
                    "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #6d28d9 0%, #db2777 100%)",
                  },
                }}
              >
                Add your first listing
              </Button>
            )}
          </Stack>
        </Paper>
      )}

      {!isLoading && !isError && total > sortedItems.length && (
        <Typography variant="caption" color="text.secondary">
          Showing {sortedItems.length} of {total}
        </Typography>
      )}
    </Stack>
  );
};

export default Collection;
