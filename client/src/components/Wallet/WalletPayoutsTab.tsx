"use client";

import { useState } from "react";

import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import {
  Alert,
  Box,
  Button,
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
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/context/auth-context";
import {
  type ConnectBalanceResponse,
  type PayoutBatchListItem,
  useStripeWallet,
} from "@/hooks/use-stripe-wallet";
import { BRAND_PALETTE } from "@/theme/brand-palette";

const PAYOUT_HISTORY_LIMIT = 10;

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function payoutStatusChip(status: PayoutBatchListItem["status"]) {
  const color =
    status === "paid"
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
      sx={{ fontWeight: 700, textTransform: "capitalize" }}
    />
  );
}

function formatPayoutDate(iso: string | undefined | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return iso;
  }
}

function BalanceCard({
  label,
  amount,
  currency,
  highlight,
}: {
  label: string;
  amount: number;
  currency: string;
  highlight?: boolean;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 3,
        height: "100%",
        borderColor: highlight ? "rgba(124,58,237,0.45)" : BRAND_PALETTE.borderSubtle,
        bgcolor: highlight ? BRAND_PALETTE.mint : "#fff",
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5, lineHeight: 1.2 }}>
        {formatMoney(amount, currency)}
      </Typography>
    </Paper>
  );
}

type WalletPayoutsTabProps = {
  /** Fetch balance only when the Payouts tab is selected. */
  active?: boolean;
  onStartOnboarding?: () => void;
  onboardingLoading?: boolean;
};

export function WalletPayoutsTab({
  active = true,
  onStartOnboarding,
  onboardingLoading,
}: WalletPayoutsTabProps) {
  const { user, hydrated } = useAuth();
  const { getConnectBalance, getPayoutBatches } = useStripeWallet();
  const [historyPage, setHistoryPage] = useState(1);

  const hasConnect = Boolean(user?.stripeConnectAccountId || user?.stripeAccountId);
  const isOnboarded = Boolean(user?.isOnboarded);
  const canLoadSellerData = Boolean(hydrated && user?.id && active && hasConnect && isOnboarded);

  const balanceQuery = useQuery({
    queryKey: ["stripe-wallet", "connect-balance", user?.id, "payouts-tab"],
    queryFn: () => getConnectBalance(),
    enabled: canLoadSellerData,
    staleTime: 30_000,
  });

  const batchesQuery = useQuery({
    queryKey: [
      "stripe-wallet",
      "payout-batches",
      user?.id,
      historyPage,
      PAYOUT_HISTORY_LIMIT,
    ],
    queryFn: () => getPayoutBatches(historyPage, PAYOUT_HISTORY_LIMIT),
    enabled: canLoadSellerData,
    staleTime: 30_000,
  });

  const data: ConnectBalanceResponse | undefined = balanceQuery.data;
  const currency = data?.currency ?? "USD";
  const payoutItems = batchesQuery.data?.items ?? [];
  const payoutTotalPages = Math.max(1, batchesQuery.data?.totalPages ?? 1);

  if (!hydrated) {
    return (
      <Box sx={{ py: 8, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!hasConnect || (balanceQuery.isSuccess && !data?.connected)) {
    return (
      <Stack spacing={2}>
        <Alert severity="info" icon={<InfoOutlinedIcon />}>
          Connect Stripe to receive seller payouts. Buyers use the Wallet tab for saved
          cards; this tab is for your Connect balance and payout schedule.
        </Alert>
        {onStartOnboarding ? (
          <Box>
            <Button
              variant="contained"
              onClick={onStartOnboarding}
              disabled={onboardingLoading}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                boxShadow: "none",
                backgroundColor: "#635bff",
                "&:hover": { backgroundColor: "#5246e8", boxShadow: "none" },
              }}
            >
              {onboardingLoading ? "Redirecting…" : "Connect Stripe for payouts"}
            </Button>
          </Box>
        ) : null}
      </Stack>
    );
  }

  if (!isOnboarded) {
    return (
      <Stack spacing={2}>
        <Alert severity="warning">
          Finish Stripe onboarding to enable payouts and view your live balance.
        </Alert>
        {onStartOnboarding ? (
          <Button
            variant="contained"
            onClick={onStartOnboarding}
            disabled={onboardingLoading}
            sx={{ alignSelf: "flex-start", textTransform: "none", fontWeight: 700 }}
          >
            {onboardingLoading ? "Redirecting…" : "Finish Stripe onboarding"}
          </Button>
        ) : null}
      </Stack>
    );
  }

  const stripeTotal =
    data?.stripeConnectTotal ??
    data?.total ??
    Number(data?.available ?? 0) + Number(data?.pending ?? 0);
  const escrowSecured = Number(data?.escrow?.secured ?? 0);
  const escrowInProgress = Number(data?.escrow?.inProgress ?? 0);

  return (
    <Stack spacing={3}>
      {balanceQuery.isError ? (
        <Alert severity="error">
          {(balanceQuery.error as Error)?.message ?? "Could not load payout balance."}
        </Alert>
      ) : null}
      <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip
          size="small"
          icon={<CheckCircleRoundedIcon />}
          label="Stripe Connect active"
          color="success"
          variant="outlined"
          sx={{ fontWeight: 700 }}
        />
      </Stack>

      <Alert severity="info" icon={<InfoOutlinedIcon />}>
        This tab is <b>Stripe Connect only</b>. Card checkout sales are paid through
        platform payout batches below. Escrow.com sales are paid directly by Escrow to
        your bank — they are not included in these balances.
      </Alert>

      {(escrowSecured > 0 || escrowInProgress > 0) && (
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 3,
            borderColor: BRAND_PALETTE.borderSubtle,
            bgcolor: "action.hover",
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
            Escrow.com sales (separate from Stripe)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {escrowSecured > 0 ? (
              <>
                Funded Escrow seller total:{" "}
                <strong>{formatMoney(escrowSecured, currency)}</strong>
                {data?.escrow?.securedSaleCount
                  ? ` (${data.escrow.securedSaleCount} sale${data.escrow.securedSaleCount === 1 ? "" : "s"})`
                  : ""}
                . Payouts and disputes are managed on Escrow.com.
              </>
            ) : null}
            {escrowSecured > 0 && escrowInProgress > 0 ? " " : null}
            {escrowInProgress > 0 ? (
              <>
                {escrowSecured > 0 ? " " : null}
                In checkout:{" "}
                <strong>{formatMoney(escrowInProgress, currency)}</strong>
                {data?.escrow?.inProgressSaleCount
                  ? ` (${data.escrow.inProgressSaleCount} open)`
                  : ""}
                .
              </>
            ) : null}
          </Typography>
        </Paper>
      )}

      {balanceQuery.isLoading ? (
        <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
          <CircularProgress size={28} />
        </Box>
      ) : data ? (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <BalanceCard
              label="Stripe balance (available + pending)"
              amount={stripeTotal}
              currency={currency}
              highlight
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <BalanceCard label="Available (Stripe)" amount={data.available} currency={currency} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <BalanceCard label="Pending (Stripe)" amount={data.pending} currency={currency} />
          </Grid>
        </Grid>
      ) : null}

      <Paper
        variant="outlined"
        sx={{
          p: 2.5,
          borderRadius: 3,
          borderColor: BRAND_PALETTE.borderSubtle,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <ScheduleRoundedIcon sx={{ color: BRAND_PALETTE.seafoam, mt: 0.25 }} />
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              Next estimated platform payout
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 700, mt: 0.5 }}>
              {formatPayoutDate(data?.nextEstimatedPayoutAt)}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              We batch seller payouts on Monday and Thursday mornings (UTC). Available
              funds in your Connect balance are included in the next run when eligible.
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {data && data.reserved > 0 ? (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <PaymentsRoundedIcon color="action" />
            <Typography variant="body2" color="text.secondary">
              Reserved:{" "}
              <strong>{formatMoney(data.reserved, currency)}</strong>
            </Typography>
          </Stack>
        </Paper>
      ) : null}

      <Alert severity="info" icon={<InfoOutlinedIcon />}>
        {data?.payoutTimingNote ??
          "Your first payout may take up to 7 days while Stripe completes risk assessment. After that, bank transfers usually arrive within 2-3 business days."}
      </Alert>

      <Box>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
          Stripe payout history
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Platform batches sent to your Stripe Connect account (card checkout sales only).
        </Typography>

        {batchesQuery.isLoading ? (
          <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
            <CircularProgress size={28} />
          </Box>
        ) : batchesQuery.isError ? (
          <Alert
            severity="error"
            action={
              <Button
                size="small"
                color="inherit"
                onClick={() => void batchesQuery.refetch()}
              >
                Retry
              </Button>
            }
          >
            {(batchesQuery.error as Error)?.message ??
              "Could not load payout history."}
          </Alert>
        ) : payoutItems.length === 0 ? (
          <Paper
            variant="outlined"
            sx={{ p: 3, borderRadius: 3, borderColor: BRAND_PALETTE.borderSubtle }}
          >
            <Typography variant="body2" color="text.secondary" textAlign="center">
              No payout batches yet. After sales clear, they appear here when a
              platform payout is initiated.
            </Typography>
          </Paper>
        ) : (
          <>
            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{ borderRadius: 3, borderColor: BRAND_PALETTE.borderSubtle }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">
                      Sales
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payoutItems.map((row) => {
                    const displayDate = row.payoutDate ?? row.createdAt;
                    const rowCurrency = row.currency || currency;
                    return (
                      <TableRow key={row._id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {formatPayoutDate(displayDate)}
                          </Typography>
                          {row.stripePayoutId ? (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: "block", fontFamily: "monospace" }}
                            >
                              {row.stripePayoutId}
                            </Typography>
                          ) : null}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>
                          {formatMoney(row.amount, rowCurrency)}
                        </TableCell>
                        <TableCell>{payoutStatusChip(row.status)}</TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="text.secondary">
                            {row.transactionCount}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {payoutTotalPages > 1 || (batchesQuery.data?.total ?? 0) > PAYOUT_HISTORY_LIMIT ? (
              <Stack alignItems="center" sx={{ mt: 2 }}>
                <Pagination
                  count={payoutTotalPages}
                  page={historyPage}
                  onChange={(_e, p) => setHistoryPage(p)}
                  color="primary"
                  shape="rounded"
                  size="small"
                />
              </Stack>
            ) : null}
          </>
        )}
      </Box>
    </Stack>
  );
}
