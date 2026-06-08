"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { DataGrid, type GridColDef, type GridPaginationModel } from "@mui/x-data-grid";
import { fetchAdminTransactions } from "@/lib/admin-api";
import {
  formatTransactionMoney,
  PAYMENT_STATUS_LABELS,
  PAYMENT_TYPE_LABELS,
} from "@/lib/transaction-labels";
import { useAdminAuth } from "@/context/admin-auth-context";

const PAGE_SIZE = 10;

type DateRange = "" | "7" | "14" | "30";

export default function AdminTransactionsPage() {
  const searchParams = useSearchParams();
  const { accessToken, hydrated } = useAdminAuth();
  const [transactionId, setTransactionId] = React.useState(
    () => searchParams.get("id")?.trim() ?? "",
  );
  const [idDebounced, setIdDebounced] = React.useState(
    () => searchParams.get("id")?.trim() ?? "",
  );
  const [status, setStatus] = React.useState("");
  const [paymentType, setPaymentType] = React.useState("");
  const [hasDispute, setHasDispute] = React.useState("");
  const [paidOut, setPaidOut] = React.useState("");
  const [days, setDays] = React.useState<DateRange>("");
  const [paginationModel, setPaginationModel] =
    React.useState<GridPaginationModel>({ page: 0, pageSize: PAGE_SIZE });

  React.useEffect(() => {
    const t = window.setTimeout(() => setIdDebounced(transactionId.trim()), 350);
    return () => window.clearTimeout(t);
  }, [transactionId]);

  React.useEffect(() => {
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  }, [idDebounced, status, paymentType, hasDispute, paidOut, days]);

  const parseTriState = (v: string): boolean | undefined => {
    if (v === "true") return true;
    if (v === "false") return false;
    return undefined;
  };

  const { data, isFetching, error } = useQuery({
    queryKey: [
      "admin-transactions",
      paginationModel.page,
      paginationModel.pageSize,
      idDebounced,
      status,
      paymentType,
      hasDispute,
      paidOut,
      days,
    ],
    queryFn: () =>
      fetchAdminTransactions({
        page: paginationModel.page + 1,
        limit: paginationModel.pageSize,
        id: idDebounced || undefined,
        status: status || undefined,
        paymentType: paymentType || undefined,
        hasDispute: parseTriState(hasDispute),
        paidOut: parseTriState(paidOut),
        days: days ? (Number(days) as 7 | 14 | 30) : undefined,
      }),
    enabled: hydrated && !!accessToken,
    placeholderData: (prev) => prev,
  });

  const columns = React.useMemo<GridColDef[]>(
    () => [
      {
        field: "id",
        headerName: "Transaction ID",
        width: 220,
        renderCell: ({ value }) => (
          <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
            {String(value)}
          </Typography>
        ),
      },
      {
        field: "listingAppName",
        headerName: "Listing",
        flex: 1,
        minWidth: 140,
        renderCell: ({ row }) => (
          <Link
            href={`/admin/listings/${encodeURIComponent(String(row.listingId))}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            {String(row.listingAppName)}
          </Link>
        ),
      },
      {
        field: "paymentStatus",
        headerName: "Status",
        width: 110,
        valueGetter: (_v, row) =>
          PAYMENT_STATUS_LABELS[String(row.paymentStatus)] ??
          String(row.paymentStatus || "—"),
      },
      {
        field: "paymentType",
        headerName: "Type",
        width: 90,
        valueGetter: (_v, row) =>
          PAYMENT_TYPE_LABELS[String(row.paymentType)] ??
          String(row.paymentType || "—"),
      },
      {
        field: "amountPaid",
        headerName: "Paid",
        width: 100,
        valueGetter: (_v, row) =>
          formatTransactionMoney(Number(row.amountPaid) || 0),
      },
      {
        field: "serviceFee",
        headerName: "Fee",
        width: 90,
        valueGetter: (_v, row) =>
          formatTransactionMoney(Number(row.serviceFee) || 0),
      },
      {
        field: "hasDispute",
        headerName: "Dispute",
        width: 80,
        valueGetter: (_v, row) => (row.hasDispute ? "Yes" : "No"),
      },
      {
        field: "paidOut",
        headerName: "Paid out",
        width: 90,
        valueGetter: (_v, row) => (row.paidOut ? "Yes" : "No"),
      },
      {
        field: "customerName",
        headerName: "Buyer",
        width: 130,
      },
      {
        field: "sellerName",
        headerName: "Seller",
        width: 130,
      },
      {
        field: "createdAt",
        headerName: "Created",
        width: 168,
        valueGetter: (_v, row) =>
          row.createdAt
            ? new Date(String(row.createdAt)).toLocaleString()
            : "—",
      },
    ],
    [],
  );

  const rows = data?.items ?? [];
  const summary = data?.summary;

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight={600}>
        Transactions
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Marketplace payments (Stripe and Escrow). Filters and totals apply to the
        current query.
      </Typography>

      {!hydrated || !accessToken ? (
        <Alert severity="info">Sign in to load transactions.</Alert>
      ) : null}

      {error ? (
        <Alert severity="error">
          {error instanceof Error ? error.message : "Failed to load"}
        </Alert>
      ) : null}

      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="overline" color="text.secondary">
              Total sales (filtered)
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              {formatTransactionMoney(summary?.totalSales ?? 0)}
            </Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="overline" color="text.secondary">
              Total service fees
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              {formatTransactionMoney(summary?.totalServiceFee ?? 0)}
            </Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="overline" color="text.secondary">
              Transactions
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              {(summary?.transactionCount ?? 0).toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      <Stack spacing={2}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} flexWrap="wrap">
          <TextField
            size="small"
            label="Transaction ID"
            placeholder="MongoDB _id"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            sx={{ minWidth: 220, flex: 1 }}
          />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="tx-status-filter">Status</InputLabel>
            <Select
              labelId="tx-status-filter"
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {Object.entries(PAYMENT_STATUS_LABELS).map(([k, label]) => (
                <MenuItem key={k} value={k}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="tx-type-filter">Payment type</InputLabel>
            <Select
              labelId="tx-type-filter"
              label="Payment type"
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {Object.entries(PAYMENT_TYPE_LABELS).map(([k, label]) => (
                <MenuItem key={k} value={k}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel id="tx-dispute-filter">Dispute</InputLabel>
            <Select
              labelId="tx-dispute-filter"
              label="Dispute"
              value={hasDispute}
              onChange={(e) => setHasDispute(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="true">Has dispute</MenuItem>
              <MenuItem value="false">No dispute</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel id="tx-payout-filter">Paid out</InputLabel>
            <Select
              labelId="tx-payout-filter"
              label="Paid out"
              value={paidOut}
              onChange={(e) => setPaidOut(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="true">Paid out</MenuItem>
              <MenuItem value="false">Not paid out</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="tx-days-filter">Date range</InputLabel>
            <Select
              labelId="tx-days-filter"
              label="Date range"
              value={days}
              onChange={(e) => setDays(e.target.value as DateRange)}
            >
              <MenuItem value="">All time</MenuItem>
              <MenuItem value="7">Last 7 days</MenuItem>
              <MenuItem value="14">Last 14 days</MenuItem>
              <MenuItem value="30">Last 30 days</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Stack>

      <Paper variant="outlined" sx={{ width: "100%", height: 560 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={isFetching}
          getRowId={(row) => String(row.id)}
          paginationMode="server"
          rowCount={data?.total ?? 0}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10]}
          disableRowSelectionOnClick
          sx={{ border: "none" }}
          slots={{
            noRowsOverlay: () => (
              <Box
                sx={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography color="text.secondary">
                  No transactions match these filters.
                </Typography>
              </Box>
            ),
          }}
        />
      </Paper>
    </Stack>
  );
}
