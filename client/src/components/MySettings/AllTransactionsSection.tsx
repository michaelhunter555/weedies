"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/context/auth-context";
import { useListings } from "@/hooks/use-listings";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import {
  Box,
  Chip,
  CircularProgress,
  Pagination,
  Paper,
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

import type { MyTransactionHistoryRow } from "../../../types";

const PAGE_LIMIT = 25;

function formatCents(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

function paymentChip(status: MyTransactionHistoryRow["paymentStatus"]) {
  const color =
    status === "succeeded"
      ? ("success" as const)
      : status === "pending"
        ? ("warning" as const)
        : status === "failed" || status === "canceled"
          ? ("error" as const)
          : ("default" as const);
  return (
    <Chip
      size="small"
      label={status}
      color={color}
      variant="outlined"
      sx={{ fontWeight: 700, height: 22, fontSize: 11 }}
    />
  );
}

function DisputeMarker() {
  return (
    <Tooltip title="This transaction is in dispute">
      <ErrorOutlineRoundedIcon
        color="warning"
        sx={{ fontSize: 18, verticalAlign: "middle", cursor: "help" }}
        aria-label="In dispute"
      />
    </Tooltip>
  );
}

export type AllTransactionsSectionProps = {
  userId: string | undefined;
  enabled?: boolean;
};

export function AllTransactionsSection({
  userId,
  enabled = true,
}: AllTransactionsSectionProps) {
  const { hydrated, accessToken } = useAuth();
  const { getMyTransactions } = useListings();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["my-transactions", userId, page, PAGE_LIMIT],
    queryFn: () => getMyTransactions({ page, limit: PAGE_LIMIT }),
    enabled: Boolean(enabled && userId && hydrated && accessToken),
    staleTime: 15_000,
  });

  if (!userId) return null;

  if (isLoading) {
    return (
      <Stack alignItems="center" py={4}>
        <CircularProgress size={32} />
      </Stack>
    );
  }

  if (isError) {
    return (
      <Typography color="error" variant="body2">
        {error instanceof Error ? error.message : "Could not load transactions."}
      </Typography>
    );
  }

  const rows = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  if (total === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, borderColor: "#ececec" }}>
        <Typography variant="body2" color="text.secondary">
          No transactions yet. Charges from checkout, escrow, and other billing will appear here.
        </Typography>
      </Paper>
    );
  }

  const countLabel = `${rows.length ? (page - 1) * PAGE_LIMIT + 1 : 0}-${(page - 1) * PAGE_LIMIT + rows.length} of ${total}`;

  return (
    <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 3, borderColor: "#ececec" }}>
      <Stack spacing={1.5}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            All transactions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Payment records you were part of as buyer or seller ({countLabel}).
          </Typography>
        </Box>

        <TableContainer>
          <Table size="small" sx={{ minWidth: 720 }} stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800, py: 1 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 800, py: 1 }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 800, py: 1 }}>Listing</TableCell>
                <TableCell sx={{ fontWeight: 800, py: 1 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 800, py: 1 }}>Escrow</TableCell>
                <TableCell sx={{ fontWeight: 800, py: 1 }}>Payment</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, py: 1 }}>
                  Service fee
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, py: 1 }}>
                  Amount paid
                </TableCell>
                <TableCell sx={{ fontWeight: 800, py: 1 }}>Paid out</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => {
                const listingHref = row.slug
                  ? `/products/${encodeURIComponent(row.listingId)}/${encodeURIComponent(row.slug)}`
                  : `/products/${encodeURIComponent(row.listingId)}`;
                return (
                  <TableRow key={row.transactionId} hover sx={{ "& td": { py: 0.75 } }}>
                    <TableCell sx={{ whiteSpace: "nowrap", fontSize: 12 }}>
                      {new Date(row.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={row.role === "buyer" ? "Bought" : "Sold"}
                        variant="outlined"
                        sx={{ height: 22, fontSize: 11, fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 160 }}>
                      <Typography
                        component={Link}
                        href={listingHref}
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                          fontSize: 12,
                          color: "primary.main",
                          textDecoration: "none",
                          display: "block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          "&:hover": { textDecoration: "underline" },
                        }}
                      >
                        {row.appName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                        {row.billingReason}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, textTransform: "capitalize" }}>
                      {row.paymentType}
                    </TableCell>
                    <TableCell sx={{ fontSize: 11, maxWidth: 120 }}>
                      {row.paymentType === "escrow" ? (
                        <Stack spacing={0.25}>
                          {row.escrowLastEvent ? (
                            <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 700 }}>
                              {row.escrowLastEvent}
                            </Typography>
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              —
                            </Typography>
                          )}
                          {row.escrowFundsSecured ? (
                            <Typography variant="caption" color="success.main" sx={{ fontSize: 10 }}>
                              Funds secured
                            </Typography>
                          ) : null}
                        </Stack>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        {paymentChip(row.paymentStatus)}
                        {row.hasDispute ? <DisputeMarker /> : null}
                      </Stack>
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: 12, whiteSpace: "nowrap" }}>
                      {formatCents(row.serviceFee, row.currency)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: 12, whiteSpace: "nowrap" }}>
                      {formatCents(row.amountPaid, row.currency)}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>
                      {row.role === "seller" ? (
                        row.paidOut ? (
                          <Chip
                            size="small"
                            label="Yes"
                            color="success"
                            variant="outlined"
                            sx={{ height: 22, fontSize: 11 }}
                          />
                        ) : (
                          <Chip
                            size="small"
                            label="No"
                            variant="outlined"
                            sx={{ height: 22, fontSize: 11 }}
                          />
                        )
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {totalPages > 1 ? (
          <Stack alignItems="center" sx={{ pt: 1 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, next) => setPage(next)}
              color="primary"
              size="small"
            />
          </Stack>
        ) : null}
      </Stack>
    </Paper>
  );
}
