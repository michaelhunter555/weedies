"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  DataGrid,
  type GridColDef,
  type GridRowSelectionModel,
} from "@mui/x-data-grid";

import { ListingGaMetricsPanel } from "@/components/Analytics/ListingGaMetricsPanel";
import { useApiFetchOrThrow } from "@/hooks/use-api-fetch";

export type GaPropertyRow = {
  id: string;
  accountDisplayName: string;
  propertyDisplayName: string;
  propertyResourceName: string;
};

function selectionToSingleId(model: GridRowSelectionModel): string | null {
  if (Array.isArray(model)) {
    const id = model[0];
    return id != null ? String(id) : null;
  }
  if (model && typeof model === "object" && "ids" in model) {
    const ids = (model as { ids: Set<unknown> }).ids;
    const first = ids?.values?.().next?.().value;
    return first != null ? String(first) : null;
  }
  return null;
}

/** Pick a GA4 property after OAuth; links it to `listingId` on the server. */
const GA_NEEDS_RECONNECT = "GA_NEEDS_RECONNECT";

export function GaPropertyPicker(props: {
  listingId: string | null | undefined;
  open: boolean;
  onLinked: () => void;
  onClose: () => void;
  onNeedsReconnect?: () => void;
}) {
  const { listingId, open, onLinked, onClose, onNeedsReconnect } = props;
  const { apiFetch } = useApiFetchOrThrow();
  const [rowSelectionModel, setRowSelectionModel] =
    useState<GridRowSelectionModel>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState<{
    propertyDisplayName: string;
    propertyResourceName: string;
  } | null>(null);

  useEffect(() => {
    if (!open) {
      setLinkSuccess(null);
      setRowSelectionModel([]);
      setErr(null);
    }
  }, [open]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["ga-properties", listingId],
    queryFn: async () => {
      try {
        const res = await apiFetch<{ properties: GaPropertyRow[] }>(
          "/integrations/google-analytics/properties",
          "GET",
        );
        return res?.properties ?? [];
      } catch (e) {
        const err = e as Error & { status?: number; code?: string };
        if (err.status === 412 || err.code === GA_NEEDS_RECONNECT) {
          onNeedsReconnect?.();
        }
        throw e;
      }
    },
    enabled: Boolean(open && listingId),
  });

  const rows = data ?? [];

  const columns: GridColDef<GaPropertyRow>[] = [
    {
      field: "accountDisplayName",
      headerName: "Account",
      flex: 1,
      minWidth: 130,
    },
    {
      field: "propertyDisplayName",
      headerName: "GA4 property",
      flex: 1.2,
      minWidth: 160,
    },
    {
      field: "propertyResourceName",
      headerName: "Resource ID",
      flex: 1,
      minWidth: 170,
    },
  ];

  const handleSave = async () => {
    setErr(null);
    const selectedId = selectionToSingleId(rowSelectionModel);
    if (!listingId) {
      setErr("Missing listing id - submit your listing again from the form.");
      return;
    }
    if (!selectedId) {
      setErr("Select one GA4 property row in the grid.");
      return;
    }
    const row = rows.find((r) => r.id === selectedId);
    if (!row) {
      setErr("Could not resolve the selected property.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/integrations/google-analytics/link-listing", "POST", {
        listingId,
        propertyResourceName: row.propertyResourceName,
        propertyDisplayName: row.propertyDisplayName,
      });
      setLinkSuccess({
        propertyDisplayName: row.propertyDisplayName,
        propertyResourceName: row.propertyResourceName,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to link property.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Box
            component="img"
            src="/google-g.svg"
            alt=""
            aria-hidden
            sx={{
              width: 28,
              height: 28,
              mt: 0.25,
              flexShrink: 0,
              display: "block",
            }}
          />
          <Stack spacing={0.5} sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={800}>
            Link a GA4 property to this listing
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Choose the Google Analytics property that matches this app. Buyers will
            see this label on the product page when the listing is verified.
          </Typography>
          </Stack>
        </Stack>

        {!listingId ? (
          <Alert severity="warning">
            No listing id found in session. Go back and submit the listing form
            again so we can attach GA4 to the correct draft.
          </Alert>
        ) : null}

        {isError ? (
          <Alert
            severity="error"
            action={
              (error as Error & { status?: number })?.status === 412 ? (
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => onNeedsReconnect?.()}
                >
                  Reconnect
                </Button>
              ) : (
                <Button color="inherit" size="small" onClick={() => void refetch()}>
                  Retry
                </Button>
              )
            }
          >
            {error instanceof Error ? error.message : "Could not load properties."}
          </Alert>
        ) : null}

        {err ? (
          <Alert severity="error" onClose={() => setErr(null)}>
            {err}
          </Alert>
        ) : null}

        {linkSuccess ? (
          <Stack spacing={2}>
            <Alert
              severity="success"
              icon={<CheckCircleRoundedIcon fontSize="inherit" />}
              sx={{ alignItems: "flex-start" }}
            >
              <Typography variant="subtitle2" fontWeight={800}>
                Saved to this listing
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.75 }}>
                Google Analytics property{" "}
                <strong>{linkSuccess.propertyDisplayName}</strong> is now linked.
                Buyers will see this name when the listing shows verified analytics.
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                component="p"
                sx={{ mt: 1, mb: 0, fontFamily: "ui-monospace, monospace" }}
              >
                {linkSuccess.propertyResourceName}
              </Typography>
            </Alert>
            {listingId ? (
              <ListingGaMetricsPanel
                listingId={listingId}
                title="Last 30 days (preview)"
              />
            ) : null}
            <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap">
              <Button
                variant="text"
                onClick={onClose}
                sx={{ textTransform: "none" }}
              >
                Close panel
              </Button>
              <Button
                variant="outlined"
                onClick={() => setLinkSuccess(null)}
                sx={{ textTransform: "none", borderRadius: 999 }}
              >
                Choose a different property
              </Button>
              <Button
                variant="contained"
                onClick={() => onLinked()}
                sx={{ textTransform: "none", borderRadius: 999 }}
              >
                Done
              </Button>
            </Stack>
          </Stack>
        ) : (
          <>
            <Box sx={{ width: "100%", minHeight: 320 }}>
              {isLoading ? (
                <Stack alignItems="center" justifyContent="center" sx={{ py: 8 }}>
                  <CircularProgress size={28} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Loading your GA4 properties…
                  </Typography>
                </Stack>
              ) : (
                <DataGrid
                  rows={rows}
                  columns={columns}
                  getRowId={(r) => r.id}
                  checkboxSelection
                  disableMultipleRowSelection
                  rowSelectionModel={rowSelectionModel}
                  onRowSelectionModelChange={setRowSelectionModel}
                  pageSizeOptions={[10, 25, 50]}
                  initialState={{
                    pagination: { paginationModel: { pageSize: 10 } },
                  }}
                  sx={{
                    border: "none",
                    "& .MuiDataGrid-columnHeaders": { borderRadius: 1 },
                  }}
                />
              )}
            </Box>

            <Stack
              direction="row"
              spacing={1}
              justifyContent="flex-end"
              flexWrap="wrap"
            >
              <Button variant="text" onClick={onClose} sx={{ textTransform: "none" }}>
                Later
              </Button>
              <Button
                variant="contained"
                disabled={saving || !listingId || isLoading}
                onClick={() => void handleSave()}
                sx={{ textTransform: "none", borderRadius: 999 }}
              >
                {saving ? "Saving…" : "Save property link"}
              </Button>
            </Stack>
          </>
        )}
      </Stack>
    </Paper>
  );
}

export type RcProjectRow = { id: string; name: string; description?: string };

/** RevenueCat: empty grid today + manual project id until API/OAuth exists. */
export function RevenueCatLinker(props: {
  listingId: string | null | undefined;
  open: boolean;
  onLinked: () => void;
}) {
  const { listingId, open, onLinked } = props;
  const { apiFetch } = useApiFetchOrThrow();
  const [projectId, setProjectId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["revenuecat-projects"],
    queryFn: async () => {
      const res = await apiFetch<{ projects: RcProjectRow[] }>(
        "/integrations/revenuecat/projects",
        "GET",
      );
      return res?.projects ?? [];
    },
    enabled: Boolean(open && listingId),
  });

  const rows = data ?? [];

  const columns: GridColDef<RcProjectRow>[] = [
    { field: "name", headerName: "Project", flex: 1, minWidth: 160 },
    { field: "id", headerName: "Project ID", flex: 0.8, minWidth: 120 },
    {
      field: "description",
      headerName: "Notes",
      flex: 1,
      minWidth: 120,
      sortable: false,
    },
  ];

  const handleSaveManual = async () => {
    setErr(null);
    if (!listingId) {
      setErr("Missing listing id.");
      return;
    }
    const pid = projectId.trim();
    if (!pid) {
      setErr("Enter a RevenueCat public API project identifier.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/integrations/revenuecat/link-listing", "POST", {
        listingId,
        projectId: pid,
        projectDisplayName: displayName.trim() || pid,
      });
      setProjectId("");
      setDisplayName("");
      onLinked();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save RevenueCat link.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack spacing={2}>
        <Typography variant="subtitle1" fontWeight={800}>
          RevenueCat project
        </Typography>
        <Typography variant="body2" color="text.secondary">
          API discovery is not wired yet. For now, paste your RevenueCat project
          identifier so the listing can show the correct account on the product
          page.
        </Typography>

        {err ? (
          <Alert severity="error" onClose={() => setErr(null)}>
            {err}
          </Alert>
        ) : null}

        <Box sx={{ width: "100%", minHeight: 220 }}>
          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={(r) => r.id}
            loading={isLoading}
            disableRowSelectionOnClick
            pageSizeOptions={[5]}
            initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
            slots={{
              noRowsOverlay: () => (
                <Stack
                  alignItems="center"
                  justifyContent="center"
                  sx={{ height: "100%", py: 3, px: 2, textAlign: "center" }}
                >
                  <Typography variant="body2" color="text.secondary">
                    No projects returned from the API yet. Use the fields below to
                    store a project id manually.
                  </Typography>
                </Stack>
              ),
            }}
            sx={{ border: "none" }}
          />
        </Box>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            label="RevenueCat project ID"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            fullWidth
            size="small"
            placeholder="e.g. proj_abc123"
          />
          <TextField
            label="Display name (optional)"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            fullWidth
            size="small"
            placeholder="Shown on product page"
          />
        </Stack>

        <Stack direction="row" justifyContent="flex-end">
          <Button
            variant="contained"
            color="secondary"
            disabled={saving || !listingId}
            onClick={() => void handleSaveManual()}
            sx={{ textTransform: "none", borderRadius: 999 }}
          >
            {saving ? "Saving…" : "Save RevenueCat link"}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
