"use client";

import Link from "next/link";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { fetchAdminDisputes } from "@/lib/admin-api";
import {
  DISPUTE_CATEGORY_LABELS,
  DISPUTE_STATUS_LABELS,
  formatDisputeMoney,
} from "@/lib/dispute-labels";
import { useAdminAuth } from "@/context/admin-auth-context";

const PAGE_SIZE = 50;

export default function AdminDisputesPage() {
  const { accessToken, hydrated } = useAdminAuth();
  const [status, setStatus] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [searchDebounced, setSearchDebounced] = React.useState("");

  React.useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(search.trim()), 350);
    return () => window.clearTimeout(t);
  }, [search]);

  const { data, isFetching, error } = useQuery({
    queryKey: ["admin-disputes", status, searchDebounced],
    queryFn: () =>
      fetchAdminDisputes({
        limit: PAGE_SIZE,
        status: status || undefined,
        q: searchDebounced || undefined,
      }),
    enabled: hydrated && !!accessToken,
  });

  const columns = React.useMemo<GridColDef[]>(
    () => [
      {
        field: "listingAppName",
        headerName: "Listing",
        flex: 1,
        minWidth: 160,
      },
      {
        field: "category",
        headerName: "Category",
        flex: 1,
        minWidth: 180,
        valueGetter: (_v, row) =>
          DISPUTE_CATEGORY_LABELS[String(row.category)] ?? String(row.category),
      },
      {
        field: "disputeStatus",
        headerName: "Status",
        width: 150,
        valueGetter: (_v, row) =>
          DISPUTE_STATUS_LABELS[String(row.disputeStatus)] ??
          String(row.disputeStatus),
      },
      { field: "initiatorName", headerName: "Opened by", width: 140 },
      {
        field: "amountPaid",
        headerName: "Paid",
        width: 100,
        valueGetter: (_v, row) =>
          formatDisputeMoney(Number(row.amountPaid) || 0),
      },
      {
        field: "requestedRefundAmount",
        headerName: "Requested",
        width: 110,
        valueGetter: (_v, row) =>
          formatDisputeMoney(Number(row.requestedRefundAmount) || 0),
      },
      {
        field: "disputeDate",
        headerName: "Opened",
        width: 168,
        valueGetter: (_v, row) =>
          row.disputeDate
            ? new Date(String(row.disputeDate)).toLocaleString()
            : "—",
      },
      {
        field: "view",
        headerName: "",
        width: 100,
        sortable: false,
        renderCell: ({ row }) => (
          <Button
            component={Link}
            href={`/admin/disputes/${encodeURIComponent(String(row.id))}`}
            size="small"
            variant="outlined"
            sx={{ textTransform: "none" }}
          >
            View
          </Button>
        ),
      },
    ],
    [],
  );

  const rows = data?.items ?? [];

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight={600}>
        Disputes
      </Typography>
      <Typography variant="body2" color="text.secondary">
        All marketplace disputes. Open a row to review evidence, parties, and status.
      </Typography>

      {!hydrated || !accessToken ? (
        <Alert severity="info">Sign in to load disputes.</Alert>
      ) : null}

      {error ? (
        <Alert severity="error">
          {error instanceof Error ? error.message : "Failed to load"}
        </Alert>
      ) : null}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          size="small"
          label="Search"
          placeholder="Name, category, explanation…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 220, flex: 1 }}
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="dispute-status-filter">Status</InputLabel>
          <Select
            labelId="dispute-status-filter"
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            {Object.entries(DISPUTE_STATUS_LABELS).map(([k, label]) => (
              <MenuItem key={k} value={k}>
                {label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <Paper variant="outlined" sx={{ width: "100%", height: 640 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={isFetching}
          getRowId={(row) => String(row.id)}
          pageSizeOptions={[25, 50, 100]}
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
          }}
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
                <Typography color="text.secondary">No disputes found.</Typography>
              </Box>
            ),
          }}
        />
      </Paper>
    </Stack>
  );
}
