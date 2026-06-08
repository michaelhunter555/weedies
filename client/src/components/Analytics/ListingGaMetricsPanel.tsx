"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { areaElementClasses, LineChart } from "@mui/x-charts/LineChart";
import { useDrawingArea } from "@mui/x-charts/hooks";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";

import { useListings } from "@/hooks/use-listings";
import { BRAND_PALETTE } from "@/theme/brand-palette";
import type { GaListingMetricsSnapshot } from "../../../types";

const GA_NEEDS_RECONNECT = "GA_NEEDS_RECONNECT";
const GA_CHART_GRADIENT_ID = "listing-ga-sessions-gradient";

function GaSessionsAreaGradient() {
  const { top, height, bottom } = useDrawingArea();
  const svgHeight = top + bottom + height;

  return (
    <defs>
      <linearGradient
        id={GA_CHART_GRADIENT_ID}
        x1="0"
        x2="0"
        y1="0"
        y2={svgHeight}
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0%" stopColor={BRAND_PALETTE.seafoam} stopOpacity={0.55} />
        <stop offset="55%" stopColor={BRAND_PALETTE.sage} stopOpacity={0.2} />
        <stop offset="100%" stopColor={BRAND_PALETTE.mint} stopOpacity={0} />
      </linearGradient>
    </defs>
  );
}

function errorCode(err: unknown): string | undefined {
  if (err && typeof err === "object" && "code" in err) {
    const c = (err as { code?: unknown }).code;
    return typeof c === "string" ? c : undefined;
  }
  return undefined;
}

function errorPayload(err: unknown): Record<string, unknown> | undefined {
  if (err && typeof err === "object" && "payload" in err) {
    return (err as { payload?: Record<string, unknown> }).payload;
  }
  return undefined;
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0s";
  const rounded = Math.round(seconds);
  const m = Math.floor(rounded / 60);
  const s = rounded % 60;
  if (m >= 120) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${h}h ${mm}m`;
  }
  if (m < 1) return `${s}s`;
  return `${m}m ${s}s`;
}

function formatBounce(rate: number): string {
  if (!Number.isFinite(rate)) return "0%";
  return `${(rate * 100).toFixed(1)}%`;
}

function shortDayLabel(isoDate: string): string {
  const parts = isoDate.split("-").map((x) => Number(x));
  const y = parts[0];
  const mo = parts[1];
  const d = parts[2];
  if (!y || !mo || !d) return isoDate;
  return new Date(y, mo - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export type ListingGaMetricsPanelProps = {
  listingId: string | null | undefined;
  /** When false, do not fetch (e.g. no GA property linked). */
  enabled?: boolean;
  title?: string;
  /** Seller/owner only — reconnect copy is not shown to buyers. */
  isListingOwner?: boolean;
  /** Owners see a reconnect CTA when GA OAuth needs to be re-granted. */
  reconnectHref?: string;
};

export function ListingGaMetricsPanel(props: ListingGaMetricsPanelProps) {
  const {
    listingId,
    enabled = true,
    title = "Last 30 days (Google Analytics)",
    isListingOwner = false,
    reconnectHref,
  } = props;
  const { getListingGoogleAnalyticsMetrics } = useListings();

  const lid = listingId ? String(listingId) : "";

  const q = useQuery<GaListingMetricsSnapshot>({
    queryKey: ["listing-ga-metrics", lid],
    queryFn: () => getListingGoogleAnalyticsMetrics(lid),
    enabled: Boolean(enabled && lid),
    staleTime: 60_000,
  });

  if (!lid || !enabled) return null;

  if (q.isLoading) {
    return (
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          {title}
        </Typography>
        <Skeleton variant="rounded" height={260} sx={{ mt: 1 }} />
      </Paper>
    );
  }

  if (q.isError) {
    const code = errorCode(q.error);
    const payload = errorPayload(q.error);
    const needsReconnect =
      code === GA_NEEDS_RECONNECT ||
      Boolean(payload && payload.needsReconnect === true);
    if (needsReconnect) {
      if (!isListingOwner) {
        return (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            <AlertTitle sx={{ fontWeight: 800 }}>
              Verified analytics unavailable
            </AlertTitle>
            This seller likely revoked this permission. Traffic metrics cannot be
            shown until they reconnect Google Analytics.
          </Alert>
        );
      }
      return (
        <Alert
          severity="warning"
          sx={{ borderRadius: 2 }}
          action={
            reconnectHref ? (
              <Button
                component={Link}
                href={reconnectHref}
                size="small"
                color="inherit"
                sx={{ fontWeight: 800 }}
              >
                Reconnect
              </Button>
            ) : undefined
          }
        >
          <AlertTitle sx={{ fontWeight: 800 }}>
            Google Analytics needs to be reconnected
          </AlertTitle>
          The stored authorization expired or was revoked. Reconnect to resume
          metrics. (Google&apos;s test-mode tokens auto-expire after 7 days.)
        </Alert>
      );
    }
    return (
      <Alert severity="warning" sx={{ borderRadius: 2 }}>
        {(q.error as Error)?.message ??
          "Could not load Google Analytics metrics."}
      </Alert>
    );
  }

  const data = q.data!;
  const labels = data.dailySessions.map((p) => shortDayLabel(p.date));
  const values = data.dailySessions.map((p) => p.sessions);
  const dense = values.length > 14;

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack spacing={1.5}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={1}
        >
          <Typography variant="subtitle1" fontWeight={800}>
            {title}
          </Typography>
          <Chip
            size="small"
            label={`${data.totalSessions.toLocaleString()} sessions (30d)`}
            variant="outlined"
          />
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" display="block">
              Bounce rate
            </Typography>
            <Typography variant="h6" fontWeight={800}>
              {formatBounce(data.bounceRate)}
            </Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" display="block">
              Avg session time
            </Typography>
            <Typography variant="h6" fontWeight={800}>
              {formatDuration(data.averageSessionDurationSeconds)}
            </Typography>
          </Box>
        </Stack>

        <Box sx={{ width: "100%", height: 280 }}>
          {values.length === 0 ? (
            <Stack
              alignItems="center"
              justifyContent="center"
              sx={{ height: "100%" }}
            >
              <Typography variant="body2" color="text.secondary">
                No session data in this date range yet.
              </Typography>
            </Stack>
          ) : (
            <LineChart
              height={280}
              series={[
                {
                  data: values,
                  label: "Sessions",
                  color: BRAND_PALETTE.seafoam,
                  area: true,
                  showMark: false,
                  curve: "monotoneX",
                },
              ]}
              xAxis={[
                {
                  scaleType: "point",
                  data: labels,
                  tickLabelStyle: dense
                    ? { fontSize: 10, angle: -40, textAnchor: "end" }
                    : { fontSize: 11 },
                },
              ]}
              margin={{
                left: 48,
                right: 12,
                top: 12,
                bottom: dense ? 56 : 32,
              }}
              grid={{ horizontal: true }}
              slotProps={{ legend: { hidden: true } }}
              sx={{
                [`& .${areaElementClasses.root}`]: {
                  fill: `url(#${GA_CHART_GRADIENT_ID})`,
                },
                "& .MuiLineElement-root": {
                  stroke: BRAND_PALETTE.charcoal,
                  strokeWidth: 2,
                },
              }}
            >
              <GaSessionsAreaGradient />
            </LineChart>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}
