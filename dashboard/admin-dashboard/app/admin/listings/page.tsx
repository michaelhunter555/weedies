"use client";

import Link from "next/link";
import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import {
  fetchActiveListings,
  fetchPendingListings,
  patchListingReview,
  type ListingReviewAction,
} from "@/lib/admin-api";
import { useAdminAuth } from "@/context/admin-auth-context";

const PAGE_SIZE = 100;

type ListingsTab = "pending" | "active";

const ListingsGridUiContext = React.createContext<{
  tab: ListingsTab;
  signedIn: boolean;
}>({ tab: "pending", signedIn: false });

function ListingsNoRowsOverlay() {
  const { tab, signedIn } = React.useContext(ListingsGridUiContext);
  const message = !signedIn
    ? "Sign in below to load listings."
    : tab === "pending"
      ? "No pending listings."
      : "No live listings.";

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
      }}
    >
      <Typography color="text.secondary" textAlign="center">
        {message}
      </Typography>
    </Box>
  );
}

const GRID_SLOTS = { noRowsOverlay: ListingsNoRowsOverlay };
const GRID_INITIAL = {
  pagination: { paginationModel: { pageSize: 25 } },
} as const;

function listingCoverUrl(row: Record<string, unknown>): string | null {
  const photos = row.photos as string[] | undefined;
  const coverIndex =
    typeof row.coverIndex === "number" && row.coverIndex >= 0
      ? row.coverIndex
      : 0;
  if (!photos?.length) return null;
  const url = photos[coverIndex] ?? photos[0];
  return typeof url === "string" && url.length > 0 ? url : null;
}

function sellerLabel(row: Record<string, unknown>): string {
  const s = row.sellerId;
  if (s && typeof s === "object" && "email" in s) {
    const email = (s as { email?: string }).email;
    const name = (s as { name?: string }).name;
    if (name && email) return `${name} <${email}>`;
    if (email) return email;
  }
  return "-";
}

const coverColumn: GridColDef = {
  field: "cover",
  headerName: "",
  width: 84,
  sortable: false,
  filterable: false,
  disableColumnMenu: true,
  align: "center",
  headerAlign: "center",
  renderCell: ({ row }) => {
    const r = row as Record<string, unknown>;
    const url = listingCoverUrl(r);
    if (!url) {
      return (
        <Box
          sx={{
            width: 64,
            height: 64,
            my: 0.5,
            borderRadius: 1.5,
            bgcolor: "action.hover",
            border: 1,
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography variant="caption" color="text.disabled">
            No img
          </Typography>
        </Box>
      );
    }
    return (
      <Box
        component="img"
        src={url}
        alt=""
        sx={{
          width: 64,
          height: 64,
          my: 0.5,
          objectFit: "cover",
          borderRadius: 1.5,
          border: 1,
          borderColor: "divider",
          display: "block",
        }}
      />
    );
  },
};

const viewColumn: GridColDef = {
  field: "view",
  headerName: "",
  width: 88,
  sortable: false,
  filterable: false,
  disableColumnMenu: true,
  renderCell: ({ row }) => {
    const id = String((row as { _id?: string })._id ?? "");
    return (
      <Button
        component={Link}
        href={`/admin/listings/${encodeURIComponent(id)}`}
        size="small"
        variant="outlined"
        sx={{ textTransform: "none" }}
      >
        Review
      </Button>
    );
  },
};

const baseColumns: GridColDef[] = [
  coverColumn,
  viewColumn,
  {
    field: "appName",
    headerName: "App",
    flex: 1.1,
    minWidth: 160,
    renderCell: ({ row, value }) => {
      const r = row as Record<string, unknown>;
      const id = String(r._id ?? "");
      const tagline =
        typeof r.tagline === "string" && r.tagline ? r.tagline : null;
      return (
        <Box sx={{ py: 0.75, minWidth: 0 }}>
          <Typography
            component={Link}
            href={`/admin/listings/${encodeURIComponent(id)}`}
            variant="body2"
            fontWeight={600}
            noWrap
            sx={{ color: "primary.main", textDecoration: "none" }}
          >
            {value as string}
          </Typography>
          {tagline ? (
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              display="block"
            >
              {tagline}
            </Typography>
          ) : null}
        </Box>
      );
    },
  },
  { field: "status", width: 130 },
  { field: "slug", flex: 0.8, minWidth: 100 },
  {
    field: "seller",
    headerName: "Seller",
    flex: 1,
    minWidth: 160,
    valueGetter: (_v, row) => sellerLabel(row as Record<string, unknown>),
  },
];

const verificationColumn: GridColDef = {
  field: "verification",
  headerName: "Verification",
  flex: 1,
  minWidth: 180,
  valueGetter: (_v, row) => {
    const r = row as Record<string, unknown>;
    const bits: string[] = [];
    if (r.isListingVerified === false) bits.push("Listing not verified");
    if (r.hasAnalyticsToVerify && !r.isAnalyticsVerified) {
      bits.push("Analytics pending");
    }
    if (r.hasSalesToVerify) bits.push("Sales claim");
    return bits.length ? bits.join(" · ") : "OK";
  },
};

const createdColumn: GridColDef = {
  field: "createdAt",
  headerName: "Created",
  width: 168,
  valueGetter: (_v, row) => {
    const c = (row as { createdAt?: string }).createdAt;
    return c ? new Date(c).toLocaleString() : "-";
  },
};

const publishedColumn: GridColDef = {
  field: "publishedAt",
  headerName: "Live since",
  width: 168,
  valueGetter: (_v, row) => {
    const c = (row as { publishedAt?: string }).publishedAt;
    return c ? new Date(c).toLocaleString() : "-";
  },
};

export default function AdminListingsPage() {
  const { accessToken, hydrated, admin } = useAdminAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = React.useState<ListingsTab>("pending");
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const pendingQuery = useQuery({
    queryKey: ["admin-listings", "pending", admin?.email ?? ""],
    queryFn: () => fetchPendingListings({ limit: PAGE_SIZE }),
    enabled: hydrated && !!accessToken,
  });

  const activeQuery = useQuery({
    queryKey: ["admin-listings", "active", admin?.email ?? ""],
    queryFn: () => fetchActiveListings({ limit: PAGE_SIZE }),
    enabled: hydrated && !!accessToken,
  });

  const gridQuery = tab === "pending" ? pendingQuery : activeQuery;
  const rows = (gridQuery.data?.items ?? []) as Record<string, unknown>[];

  const runReview = React.useCallback(
    async (listingId: string, action: ListingReviewAction) => {
      setActionError(null);
      setBusyId(listingId);
      try {
        await patchListingReview(listingId, action);
        await queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
      } catch (e) {
        setActionError(e instanceof Error ? e.message : "Update failed");
      } finally {
        setBusyId(null);
      }
    },
    [queryClient],
  );

  const pendingReject = React.useCallback(
    async (listingId: string) => {
      const reason = window.prompt(
        "Optional rejection note (shown to seller later if you add that UI):",
        "",
      );
      if (reason === null) return;
      setActionError(null);
      setBusyId(listingId);
      try {
        await patchListingReview(listingId, "reject", {
          rejectionReason: reason.trim() || undefined,
        });
        await queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
      } catch (e) {
        setActionError(e instanceof Error ? e.message : "Update failed");
      } finally {
        setBusyId(null);
      }
    },
    [queryClient],
  );

  const actionsColumnPending: GridColDef = React.useMemo(
    () => ({
      field: "actions",
      headerName: "Review",
      minWidth: 200,
      flex: 0.6,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: ({ row }) => {
        const id = String((row as { _id?: string })._id ?? "");
        const busy = busyId === id;
        return (
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ py: 0.5 }}>
            <Button
              size="small"
              variant="contained"
              color="success"
              disabled={busy}
              onClick={() => void runReview(id, "approve")}
            >
              Approve
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              disabled={busy}
              onClick={() => void pendingReject(id)}
            >
              Reject
            </Button>
          </Stack>
        );
      },
    }),
    [busyId, runReview, pendingReject],
  );

  const actionsColumnActive: GridColDef = React.useMemo(
    () => ({
      field: "actions",
      headerName: "Moderation",
      minWidth: 140,
      flex: 0.4,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: ({ row }) => {
        const id = String((row as { _id?: string })._id ?? "");
        const busy = busyId === id;
        return (
          <Button
            size="small"
            variant="outlined"
            color="warning"
            disabled={busy}
            onClick={() => void runReview(id, "unpublish")}
          >
            Take down
          </Button>
        );
      },
    }),
    [busyId, runReview],
  );

  const columns = React.useMemo(
    () =>
      tab === "pending"
        ? [...baseColumns, createdColumn, actionsColumnPending]
        : [...baseColumns, publishedColumn, verificationColumn, actionsColumnActive],
    [tab, actionsColumnPending, actionsColumnActive],
  );

  const gridUi = React.useMemo(
    () => ({ tab, signedIn: !!(hydrated && accessToken) }),
    [tab, hydrated, accessToken],
  );

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight={600}>
        Listings
      </Typography>
      <Typography variant="body2" color="text.secondary">
        <strong>Pending</strong> - approve to set status <strong>live</strong> (shows on
        the public marketplace). Reject sends it to <strong>rejected</strong>.
        <strong> Active</strong> - live listings; <strong>Take down</strong> sets{" "}
        <strong>paused</strong> so they disappear from the storefront.
      </Typography>

      {!hydrated || !accessToken ? (
        <Alert severity="info">
          Sign in at the bottom of the page to load data from the API.
        </Alert>
      ) : null}

      {actionError ? (
        <Alert severity="error" onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      ) : null}

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ borderBottom: 1, borderColor: "divider" }}
      >
        <Tab label="Pending" value="pending" />
        <Tab label="Active" value="active" />
      </Tabs>

      {gridQuery.error ? (
        <Alert severity="error">
          {gridQuery.error instanceof Error
            ? gridQuery.error.message
            : "Failed to load"}
        </Alert>
      ) : null}

      <ListingsGridUiContext.Provider value={gridUi}>
        <Paper variant="outlined" sx={{ width: "100%", height: 640 }}>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={gridQuery.isFetching}
            getRowId={(row) => String((row as { _id?: string })._id ?? "")}
            rowHeight={84}
            pageSizeOptions={[10, 25, 50, 100]}
            initialState={GRID_INITIAL}
            disableRowSelectionOnClick
            sx={{ border: "none" }}
            slots={GRID_SLOTS}
          />
        </Paper>
      </ListingsGridUiContext.Provider>
    </Stack>
  );
}
