"use client";

import Link from "next/link";

import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";

import { useStripeWallet } from "@/hooks/use-stripe-wallet";
import type { BillingHistoryRow } from "../../../types";

const PLACEHOLDER = "/placeholder-app-cover.svg";

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

function listingHref(row: BillingHistoryRow): string {
  if (row.slug) {
    return `/products/${encodeURIComponent(row.listingId)}/${encodeURIComponent(row.slug)}`;
  }
  return `/products/${encodeURIComponent(row.listingId)}`;
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

function reasonLabel(reason: string): string {
  if (reason === "Listing fee") return "Listing fee";
  if (reason === "Listing purchase") return "App purchase";
  return reason || "Charge";
}

function BillingMobileCard({ row }: { row: BillingHistoryRow }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 1.5, borderRadius: 2, borderColor: "#ececec" }}>
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Box
          component="img"
          src={row.coverUrl || PLACEHOLDER}
          alt=""
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            objectFit: "cover",
            bgcolor: "action.hover",
            flexShrink: 0,
          }}
        />
        <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 800, lineHeight: 1.3 }}>
            {row.appName}
          </Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            <Chip
              size="small"
              label={reasonLabel(row.billingReason)}
              variant="outlined"
              sx={{ height: 22, fontSize: 11, fontWeight: 700 }}
            />
            {paymentChip(row.paymentStatus)}
          </Stack>
          <Typography variant="body2" sx={{ fontWeight: 800 }}>
            {formatAmount(row.amountCents, row.currency)}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ wordBreak: "break-word", lineHeight: 1.4 }}
          >
            {new Date(row.purchasedAt).toLocaleString()}
          </Typography>
          <Button
            component={Link}
            href={listingHref(row)}
            size="small"
            variant="outlined"
            endIcon={<OpenInNewRoundedIcon sx={{ fontSize: 16 }} />}
            sx={{ alignSelf: "flex-start", textTransform: "none", fontWeight: 700 }}
          >
            View listing
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

export function WalletBillingTab() {
  const { getBillingHistory } = useStripeWallet();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["stripe-billing-history"],
    queryFn: () => getBillingHistory(50),
    staleTime: 30_000,
  });

  const items = data?.items ?? [];

  if (isLoading) {
    return (
      <Stack alignItems="center" py={6}>
        <CircularProgress size={32} />
      </Stack>
    );
  }

  if (isError) {
    return (
      <Alert
        severity="error"
        action={
          <Button size="small" color="inherit" onClick={() => void refetch()}>
            Retry
          </Button>
        }
      >
        {error instanceof Error ? error.message : "Could not load billing history."}
      </Alert>
    );
  }

  if (!items.length) {
    return (
      <Paper
        variant="outlined"
        sx={{ p: 4, borderRadius: 2, textAlign: "center", borderStyle: "dashed" }}
      >
        <ReceiptLongRoundedIcon color="disabled" sx={{ fontSize: 36 }} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          No charges yet. Listing fees and app purchases will appear here.
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Listing fees, checkout payments, and other charges on your Stripe customer.
      </Typography>

      <Box sx={{ display: { xs: "block", md: "none" } }}>
        {items.map((row) => (
          <BillingMobileCard key={row.transactionId} row={row} />
        ))}
      </Box>

      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{ display: { xs: "none", md: "block" }, borderRadius: 2 }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 800 }} />
              <TableCell sx={{ fontWeight: 800 }}>App</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Amount</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((row) => (
              <TableRow key={row.transactionId} hover>
                <TableCell sx={{ width: 56 }}>
                  <Box
                    component="img"
                    src={row.coverUrl || PLACEHOLDER}
                    alt=""
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 1.5,
                      objectFit: "cover",
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {row.appName}
                  </Typography>
                  <Button
                    component={Link}
                    href={listingHref(row)}
                    size="small"
                    sx={{ textTransform: "none", fontWeight: 600, p: 0, minWidth: 0 }}
                  >
                    View listing
                  </Button>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{reasonLabel(row.billingReason)}</Typography>
                </TableCell>
                <TableCell sx={{ fontWeight: 800, whiteSpace: "nowrap" }}>
                  {formatAmount(row.amountCents, row.currency)}
                </TableCell>
                <TableCell>{paymentChip(row.paymentStatus)}</TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(row.purchasedAt).toLocaleString()}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}
