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
const RC_NEEDS_RECONNECT = "RC_NEEDS_RECONNECT";

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
            {(error as Error)?.message ?? "Could not load GA4 properties."}
          </Alert>
        ) : null}

        {linkSuccess ? (
          <Alert
            severity="success"
            icon={<CheckCircleRoundedIcon />}
            action={
              <Button color="inherit" size="small" onClick={onLinked}>
                Done
              </Button>
            }
          >
            Linked <b>{linkSuccess.propertyDisplayName}</b> to this listing.
          </Alert>
        ) : (
          <>
            <Box sx={{ width: "100%", minHeight: 280 }}>
              <DataGrid
                rows={rows}
                columns={columns}
                getRowId={(r) => r.id}
                loading={isLoading}
                checkboxSelection
                disableMultipleRowSelection
                rowSelectionModel={rowSelectionModel}
                onRowSelectionModelChange={setRowSelectionModel}
                pageSizeOptions={[5, 10]}
                initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
                sx={{ border: "none" }}
              />
            </Box>

            {err ? (
              <Alert severity="error" onClose={() => setErr(null)}>
                {err}
              </Alert>
            ) : null}

            <Stack direction="row" justifyContent="flex-end" spacing={1}>
              <Button variant="text" onClick={onClose} sx={{ textTransform: "none" }}>
                Cancel
              </Button>
              <Button
                variant="contained"
                disabled={saving || !listingId}
                onClick={() => void handleSave()}
                sx={{ textTransform: "none", borderRadius: 999 }}
              >
                {saving ? "Saving…" : "Link property"}
              </Button>
            </Stack>
          </>
        )}

        {listingId && linkSuccess ? (
          <ListingGaMetricsPanel listingId={listingId} />
        ) : null}
      </Stack>
    </Paper>
  );
}

export type RcProjectRow = { id: string; name: string; description?: string };

/** RevenueCat: OAuth project picker after connect. */
export function RevenueCatLinker(props: {
  listingId: string | null | undefined;
  open: boolean;
  onLinked: () => void;
  onNeedsReconnect?: () => void;
}) {
  const { listingId, open, onLinked, onNeedsReconnect } = props;
  const { apiFetch } = useApiFetchOrThrow();
  const [rowSelectionModel, setRowSelectionModel] =
    useState<GridRowSelectionModel>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState<{
    projectId: string;
    projectDisplayName: string;
  } | null>(null);

  useEffect(() => {
    if (!open) {
      setLinkSuccess(null);
      setRowSelectionModel([]);
      setErr(null);
    }
  }, [open]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["revenuecat-projects", listingId],
    queryFn: async () => {
      try {
        const res = await apiFetch<{ projects: RcProjectRow[] }>(
          "/integrations/revenuecat/projects",
          "GET",
        );
        return res?.projects ?? [];
      } catch (e) {
        const errObj = e as Error & { status?: number; code?: string };
        if (errObj.status === 412 || errObj.code === RC_NEEDS_RECONNECT) {
          onNeedsReconnect?.();
        }
        throw e;
      }
    },
    enabled: Boolean(open && listingId),
  });

  const rows = data ?? [];

  const columns: GridColDef<RcProjectRow>[] = [
    { field: "name", headerName: "Project", flex: 1, minWidth: 160 },
    { field: "id", headerName: "Project ID", flex: 0.8, minWidth: 140 },
    {
      field: "description",
      headerName: "Notes",
      flex: 1,
      minWidth: 120,
      sortable: false,
    },
  ];

  const handleSave = async () => {
    setErr(null);
    const selectedId = selectionToSingleId(rowSelectionModel);
    if (!listingId) {
      setErr("Missing listing id.");
      return;
    }
    if (!selectedId) {
      setErr("Select one RevenueCat project in the grid.");
      return;
    }
    const row = rows.find((r) => r.id === selectedId);
    if (!row) {
      setErr("Could not resolve the selected project.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/integrations/revenuecat/link-listing", "POST", {
        listingId,
        projectId: row.id,
        projectDisplayName: row.name,
      });
      setLinkSuccess({
        projectId: row.id,
        projectDisplayName: row.name,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to link RevenueCat project.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack spacing={2}>
        <Typography variant="subtitle1" fontWeight={800}>
          Link a RevenueCat project to this listing
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Choose the RevenueCat project that matches this app. Buyers will see this
          label on the product page when sales data is verified.
        </Typography>

        {!listingId ? (
          <Alert severity="warning">Missing listing id.</Alert>
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
            {(error as Error)?.message ?? "Could not load RevenueCat projects."}
          </Alert>
        ) : null}

        {linkSuccess ? (
          <Alert
            severity="success"
            icon={<CheckCircleRoundedIcon />}
            action={
              <Button color="inherit" size="small" onClick={onLinked}>
                Done
              </Button>
            }
          >
            Linked <b>{linkSuccess.projectDisplayName}</b> to this listing.
          </Alert>
        ) : (
          <>
            <Box sx={{ width: "100%", minHeight: 280 }}>
              <DataGrid
                rows={rows}
                columns={columns}
                getRowId={(r) => r.id}
                loading={isLoading}
                checkboxSelection
                disableMultipleRowSelection
                rowSelectionModel={rowSelectionModel}
                onRowSelectionModelChange={setRowSelectionModel}
                pageSizeOptions={[5, 10]}
                initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
                slots={{
                  noRowsOverlay: () => (
                    <Stack
                      alignItems="center"
                      justifyContent="center"
                      sx={{ height: "100%", py: 3, px: 2, textAlign: "center" }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        No projects returned. Confirm your RevenueCat OAuth app has
                        the project_configuration:projects:read scope.
                      </Typography>
                    </Stack>
                  ),
                }}
                sx={{ border: "none" }}
              />
            </Box>

            {err ? (
              <Alert severity="error" onClose={() => setErr(null)}>
                {err}
              </Alert>
            ) : null}

            <Stack direction="row" justifyContent="flex-end">
              <Button
                variant="contained"
                color="secondary"
                disabled={saving || !listingId || isLoading}
                onClick={() => void handleSave()}
                sx={{ textTransform: "none", borderRadius: 999 }}
              >
                {saving ? "Saving…" : "Link project"}
              </Button>
            </Stack>
          </>
        )}
      </Stack>
    </Paper>
  );
}
