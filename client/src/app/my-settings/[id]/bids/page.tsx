"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import LaunchRoundedIcon from "@mui/icons-material/LaunchRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { useAuth } from "@/context/auth-context";
import { useListings } from "@/hooks/use-listings";
import type { AuctionBidStatus, MyAuctionBidRow } from "../../../../../types";

const PLACEHOLDER_COVER = "/placeholder-app-cover.svg";

function coverFor(row: MyAuctionBidRow): string {
  const photos = row.listing.photos ?? [];
  if (!photos.length) return PLACEHOLDER_COVER;
  const idx = Math.min(
    Math.max(0, row.listing.coverIndex ?? 0),
    photos.length - 1,
  );
  return photos[idx] ?? PLACEHOLDER_COVER;
}

function listingHref(row: MyAuctionBidRow): string {
  const id = row.listing._id;
  const slug = row.listing.slug?.trim();
  if (id && slug) return `/products/${encodeURIComponent(id)}/${encodeURIComponent(slug)}`;
  if (id) return `/products/${encodeURIComponent(id)}`;
  return "/products";
}

function bidChipColor(
  s: AuctionBidStatus,
): "warning" | "success" | "default" {
  if (s === "pending") return "warning";
  if (s === "accepted") return "success";
  return "default";
}

export default function MyAuctionBidsPage() {
  const params = useParams<{ id: string }>();
  const { user, hydrated } = useAuth();
  const { getMyAuctionBids } = useListings();
  const [filter, setFilter] = useState<"active" | "all">("active");

  const routeUserId = params?.id ? String(params.id).trim() : "";
  const sessionUserId = user?.id ? String(user.id).trim() : "";

  const bidsQuery = useQuery({
    queryKey: ["my-auction-bids", user?.id],
    queryFn: getMyAuctionBids,
    enabled: Boolean(hydrated && user?.id && routeUserId === sessionUserId),
    staleTime: 20_000,
  });

  const rows = useMemo(() => {
    const raw = bidsQuery.data ?? [];
    if (filter !== "active") return raw;
    return raw.filter((r) => {
      const hasPending = r.myBids.some((b) => b.bidStatus === "pending");
      const live = r.listing.status === "live";
      return hasPending && live;
    });
  }, [bidsQuery.data, filter]);

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
        <Alert severity="warning">Please log in to see your bids.</Alert>
      </Container>
    );
  }

  if (routeUserId && sessionUserId && routeUserId !== sessionUserId) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Alert severity="info">This bids page is tied to another account.</Alert>
        <Button
          component={Link}
          href={`/my-settings/${encodeURIComponent(sessionUserId)}/bids`}
          sx={{ mt: 2 }}
          variant="contained"
        >
          Open my bids
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 3 }, px: { xs: 0, sm: 2 } }}>
      <Stack spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>
            My bids
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Live and past auction listings where you have placed a bid. Use{" "}
            <b>Active</b> to focus on auctions that are still open and waiting on the
            seller.
          </Typography>
        </Box>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={filter}
          onChange={(_e, v) => {
            if (v === "active" || v === "all") setFilter(v);
          }}
          sx={{ alignSelf: "flex-start" }}
        >
          <ToggleButton value="active">Active</ToggleButton>
          <ToggleButton value="all">All</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {bidsQuery.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {bidsQuery.error instanceof Error
            ? bidsQuery.error.message
            : "Could not load bids."}
        </Alert>
      )}

      {bidsQuery.isLoading ? (
        <Box sx={{ py: 8, display: "flex", justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      ) : rows.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, borderRadius: 3, borderColor: "#ececec" }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            {filter === "active"
              ? "No active bids right now. When you bid on a live auction, it will show here until the seller responds or the listing closes."
              : "You have not placed any auction bids yet."}
          </Typography>
          <Button component={Link} href="/products" variant="contained" sx={{ textTransform: "none" }}>
            Browse marketplace
          </Button>
        </Paper>
      ) : (
        <Stack spacing={2.5}>
          {rows.map((row) => (
            <Paper
              key={row.listing._id}
              variant="outlined"
              sx={{
                borderRadius: 3,
                borderColor: "#ececec",
                overflow: "hidden",
              }}
            >
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                sx={{ p: 2 }}
                alignItems={{ sm: "flex-start" }}
              >
                <Box
                  component="img"
                  src={coverFor(row)}
                  alt=""
                  sx={{
                    width: { xs: "100%", sm: 120 },
                    height: 88,
                    objectFit: "cover",
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    flexShrink: 0,
                  }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack
                    direction="row"
                    alignItems="flex-start"
                    justifyContent="space-between"
                    spacing={1}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                        {row.listing.appName}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.75 }} flexWrap="wrap">
                        <Chip
                          size="small"
                          label={row.listing.status}
                          sx={{ textTransform: "capitalize", fontWeight: 700 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          Current price{" "}
                          <b>${Number(row.listing.auctionCurrentPrice ?? 0).toLocaleString()}</b>
                          {row.listing.auctionMinimumNextBid != null ? (
                            <>
                              {" "}
                              · Min next{" "}
                              <b>
                                $
                                {Number(row.listing.auctionMinimumNextBid).toLocaleString()}
                              </b>
                            </>
                          ) : null}
                        </Typography>
                      </Stack>
                    </Box>
                    <Button
                      component={Link}
                      href={listingHref(row)}
                      size="small"
                      variant="outlined"
                      endIcon={<LaunchRoundedIcon />}
                      sx={{ textTransform: "none", flexShrink: 0 }}
                    >
                      View listing
                    </Button>
                  </Stack>

                  <TableContainer sx={{ mt: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: "#fafafa" }}>
                          <TableCell sx={{ fontWeight: 800 }}>Your bid</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Placed</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {row.myBids.map((b) => (
                          <TableRow key={b._id}>
                            <TableCell sx={{ fontWeight: 700 }}>
                              ${Math.round(b.amount).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              {b.createdAt
                                ? new Date(b.createdAt).toLocaleString()
                                : "—"}
                            </TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={b.bidStatus}
                                color={bidChipColor(b.bidStatus)}
                                sx={{ textTransform: "capitalize", fontWeight: 700 }}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Container>
  );
}
