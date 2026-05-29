"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useListings } from "@/hooks/use-listings";
import { brandContainedButtonSx } from "@/theme/brand-palette";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Pagination,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

import type { MarketplaceOrderRow, MyMarketplaceOrdersPayload } from "../../../types";

const PLACEHOLDER = "/placeholder-app-cover.svg";
const FULL_PAGE_LIMIT = 20;
const COMPACT_LIMIT = 3;

function formatAmount(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

function listingProductHref(row: MarketplaceOrderRow): string {
  if (row.slug) {
    return `/products/${encodeURIComponent(row.listingId)}/${encodeURIComponent(row.slug)}`;
  }
  return `/products/${encodeURIComponent(row.listingId)}`;
}

function exchangeHref(listingId: string): string {
  return `/exchange/${encodeURIComponent(listingId)}`;
}

function paymentChip(status: string | undefined) {
  const s = status ?? "pending";
  const color =
    s === "succeeded"
      ? ("success" as const)
      : s === "pending"
        ? ("warning" as const)
        : s === "failed" || s === "canceled"
          ? ("error" as const)
          : ("default" as const);
  return <Chip size="small" label={s} color={color} variant="outlined" sx={{ fontWeight: 700 }} />;
}

function OrderMobileCard({ row }: { row: MarketplaceOrderRow }) {
  const thumb = row.coverUrl || PLACEHOLDER;
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        mb: 1.5,
        borderRadius: 2,
        borderColor: "#ececec",
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Box
          component="img"
          src={thumb}
          alt=""
          sx={{
            width: 52,
            height: 52,
            borderRadius: 2,
            objectFit: "cover",
            bgcolor: "action.hover",
            flexShrink: 0,
          }}
        />
        <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 800, lineHeight: 1.3 }}>
            {row.appName}
          </Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            <Chip
              size="small"
              label={row.role === "buyer" ? "You bought" : "You sold"}
              variant="outlined"
              sx={{
                height: 22,
                fontSize: 11,
                fontWeight: 700,
                borderColor: row.role === "buyer" ? "primary.main" : "secondary.main",
                color: row.role === "buyer" ? "primary.main" : "secondary.main",
              }}
            />
            {paymentChip(row.paymentStatus)}
            {row.listingStatus === "sold" ? (
              <Chip size="small" label="Sold" sx={{ height: 22, fontSize: 11 }} />
            ) : null}
          </Stack>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 800 }}>
              {formatAmount(row.amountCents, row.currency)}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", lineHeight: 1.4, wordBreak: "break-word" }}
            >
              {new Date(row.purchasedAt).toLocaleString()}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              component={Link}
              href={listingProductHref(row)}
              size="small"
              variant="outlined"
              endIcon={<OpenInNewRoundedIcon sx={{ fontSize: 16 }} />}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              Listing
            </Button>
            <Button
              component={Link}
              href={exchangeHref(row.listingId)}
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
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  );
}

function OrderMiniRow({
  row,
  variant,
}: {
  row: MarketplaceOrderRow;
  variant: "full" | "compact";
}) {
  const thumb = row.coverUrl || PLACEHOLDER;
  return (
    <TableRow hover>
      <TableCell sx={{ py: 1.5, width: variant === "compact" ? 56 : 72 }}>
        <Box
          component="img"
          src={thumb}
          alt=""
          sx={{
            width: variant === "compact" ? 44 : 56,
            height: variant === "compact" ? 44 : 56,
            borderRadius: 2,
            objectFit: "cover",
            bgcolor: "action.hover",
          }}
        />
      </TableCell>
      <TableCell sx={{ py: 1.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
          {row.appName}
        </Typography>
        <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
          <Chip
            size="small"
            label={row.role === "buyer" ? "You bought" : "You sold"}
            variant="outlined"
            sx={{
              height: 22,
              fontSize: 11,
              fontWeight: 700,
              borderColor: row.role === "buyer" ? "primary.main" : "secondary.main",
              color: row.role === "buyer" ? "primary.main" : "secondary.main",
            }}
          />
          {paymentChip(row.paymentStatus)}
          {row.listingStatus === "sold" ? (
            <Chip size="small" label="Sold" sx={{ height: 22, fontSize: 11 }} />
          ) : null}
        </Stack>
      </TableCell>
      <TableCell sx={{ py: 1.5, minWidth: 120 }}>
        <Typography variant="body2" sx={{ fontWeight: 800, whiteSpace: "nowrap" }}>
          {formatAmount(row.amountCents, row.currency)}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", maxWidth: 200, lineHeight: 1.35 }}
        >
          {new Date(row.purchasedAt).toLocaleString()}
        </Typography>
      </TableCell>
      <TableCell sx={{ py: 1.5 }}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button
            component={Link}
            href={listingProductHref(row)}
            size="small"
            variant="outlined"
            endIcon={<OpenInNewRoundedIcon sx={{ fontSize: 16 }} />}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            Listing
          </Button>
          <Button
            component={Link}
            href={exchangeHref(row.listingId)}
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
        </Stack>
      </TableCell>
    </TableRow>
  );
}

export type MarketplaceOrdersSectionProps = {
  userId: string | undefined;
  enabled?: boolean;
  variant?: "full" | "compact";
  /** Compact: link for the header \"View all orders\" button. */
  ordersPageHref?: string;
};

export function MarketplaceOrdersSection({
  userId,
  enabled = true,
  variant = "full",
  ordersPageHref,
}: MarketplaceOrdersSectionProps) {
  const { getMyMarketplaceOrders } = useListings();
  const limit = variant === "compact" ? COMPACT_LIMIT : FULL_PAGE_LIMIT;
  const [purchasePage, setPurchasePage] = useState(1);
  const [salePage, setSalePage] = useState(1);

  const { data, isLoading, isError, error } = useQuery<MyMarketplaceOrdersPayload>({
    queryKey: [
      "my-marketplace-orders",
      userId,
      variant,
      purchasePage,
      salePage,
      limit,
    ],
    queryFn: () =>
      getMyMarketplaceOrders({
        purchasePage: variant === "full" ? purchasePage : 1,
        salePage: variant === "full" ? salePage : 1,
        limit,
      }),
    enabled: Boolean(enabled && userId),
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
        {error instanceof Error ? error.message : "Could not load orders."}
      </Typography>
    );
  }

  const purchases = data?.purchases;
  const sales = data?.sales;
  const purchaseRows = purchases?.items ?? [];
  const saleRows = sales?.items ?? [];
  const purchaseTotal = purchases?.total ?? 0;
  const saleTotal = sales?.total ?? 0;
  const hasAny = purchaseTotal > 0 || saleTotal > 0;

  if (!hasAny) {
    return (
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, borderColor: "#ececec" }}>
        <Stack spacing={1}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Marketplace orders
          </Typography>
          <Typography variant="body2" color="text.secondary">
            When you buy an app (buy it now) or sell one through checkout, it will show up here
            with links to the listing and the exchange room for handover.
          </Typography>
        </Stack>
      </Paper>
    );
  }

  const renderTable = (
    title: string,
    icon: React.ReactNode,
    rows: MarketplaceOrderRow[],
    total: number,
    page: number,
    totalPages: number,
    onPageChange: (page: number) => void,
  ) => {
    if (!total) return null;
    const countLabel =
      variant === "full"
        ? `${rows.length ? (page - 1) * limit + 1 : 0}-${(page - 1) * limit + rows.length} of ${total}`
        : `${rows.length} of ${total}`;
    return (
      <Box sx={{ mb: variant === "full" ? 3 : 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          {icon}
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            ({countLabel})
          </Typography>
        </Stack>
        <Box sx={{ display: { xs: "block", md: "none" } }}>
          {rows.map((row) => (
            <OrderMobileCard key={row.transactionId} row={row} />
          ))}
        </Box>
        <Box sx={{ display: { xs: "none", md: "block" }, overflowX: "auto" }}>
          <Table size="small" sx={{ minWidth: 640 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}> </TableCell>
                <TableCell sx={{ fontWeight: 800 }}>App</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Payment</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Next step</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <OrderMiniRow key={row.transactionId} row={row} variant={variant} />
              ))}
            </TableBody>
          </Table>
        </Box>
        {variant === "full" && totalPages > 1 ? (
          <Stack alignItems="center" sx={{ mt: 2 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, next) => onPageChange(next)}
              color="primary"
              size="small"
            />
          </Stack>
        ) : null}
      </Box>
    );
  };

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, borderColor: "#ececec" }}>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              {variant === "full" ? "Orders & handover" : "Recent orders"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Open the <b>exchange</b> room to coordinate asset transfer with the other party. Payment
              may show as pending until capture completes; the room still works once the sale is
              recorded.
              {variant === "full" ? (
                <>
                  {" "}
                  Showing <b>{limit}</b> orders per page (newest first).
                </>
              ) : (
                <>
                  {" "}
                  Dashboard preview shows <b>{COMPACT_LIMIT}</b> per list. Use View all orders for
                  the full paginated history.
                </>
              )}
            </Typography>
          </Box>
          {variant === "compact" &&
          ordersPageHref &&
          (purchaseTotal > COMPACT_LIMIT || saleTotal > COMPACT_LIMIT) ? (
            <Button
              component={Link}
              href={ordersPageHref}
              variant="outlined"
              size="small"
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              View all orders
            </Button>
          ) : null}
        </Stack>

        <Divider />

        {renderTable(
          "Your purchases",
          <ReceiptLongRoundedIcon color="primary" fontSize="small" />,
          purchaseRows,
          purchaseTotal,
          purchases?.page ?? 1,
          purchases?.totalPages ?? 1,
          setPurchasePage,
        )}
        {renderTable(
          "Your sales",
          <StorefrontRoundedIcon color="secondary" fontSize="small" />,
          saleRows,
          saleTotal,
          sales?.page ?? 1,
          sales?.totalPages ?? 1,
          setSalePage,
        )}
      </Stack>
    </Paper>
  );
}
