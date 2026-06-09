"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BarChart, barElementClasses } from "@mui/x-charts/BarChart";
import { useDrawingArea } from "@mui/x-charts/hooks";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";

import { useListings } from "@/hooks/use-listings";
import { BRAND_PALETTE } from "@/theme/brand-palette";
import type {
  RcListingMetricsSnapshot,
  RevenueCatOverviewMetric,
} from "../../../types";

const RC_NEEDS_RECONNECT = "RC_NEEDS_RECONNECT";
const RC_CHART_GRADIENT_ID = "listing-rc-metrics-bar-gradient";

/** Same seafoam → sage → mint fade as the GA sessions area chart. */
function RcBarGradient() {
  const { top, height, bottom } = useDrawingArea();
  const svgHeight = top + bottom + height;

  return (
    <defs>
      <linearGradient
        id={RC_CHART_GRADIENT_ID}
        x1="0"
        x2="0"
        y1="0"
        y2={svgHeight}
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0%" stopColor={BRAND_PALETTE.seafoam} stopOpacity={0.85} />
        <stop offset="50%" stopColor={BRAND_PALETTE.sage} stopOpacity={0.45} />
        <stop offset="100%" stopColor={BRAND_PALETTE.mint} stopOpacity={0.2} />
      </linearGradient>
    </defs>
  );
}

/** Count metrics worth charting as a quick visual comparison. */
const COUNT_METRIC_IDS = [
  "active_subscriptions",
  "active_trials",
  "new_customers",
  "active_users",
];

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

function isMoney(unit: string): boolean {
  return Boolean(unit) && unit !== "#";
}

function formatMoney(value: number, symbol: string): string {
  const abs = Math.abs(value);
  const fractionDigits = abs >= 1000 || Number.isInteger(value) ? 0 : 2;
  const num = value.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  return `${symbol}${num}`;
}

function formatCount(value: number): string {
  return value.toLocaleString();
}

function formatMetricValue(
  metric: { unit: string; value: number },
  symbol: string,
): string {
  return isMoney(metric.unit)
    ? formatMoney(metric.value, symbol)
    : formatCount(metric.value);
}

/** Humanize RevenueCat ISO-8601 period strings (e.g. P28D -> "last 28 days"). */
function periodLabel(period: string | null): string | null {
  if (!period) return null;
  if (period === "P0D") return "current";
  const m = /^P(\d+)D$/.exec(period);
  if (m) return `last ${m[1]} days`;
  return null;
}

function shortMetricLabel(name: string): string {
  return name
    .replace(/last \d+ days?/i, "")
    .replace(/\(.*?\)/g, "")
    .trim();
}

function MetricTile(props: {
  metric: RevenueCatOverviewMetric;
  symbol: string;
  emphasized?: boolean;
}) {
  const { metric, symbol, emphasized } = props;
  const sub = periodLabel(metric.period);
  return (
    <Box
      sx={{
        flex: "1 1 140px",
        minWidth: 140,
        p: 1.5,
        borderRadius: 2,
        border: `1px solid #000`,
        bgcolor: emphasized ? BRAND_PALETTE.mint : "transparent",
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        display="block"
        sx={{ lineHeight: 1.3 }}
      >
        {shortMetricLabel(metric.name)}
      </Typography>
      <Typography
        variant={emphasized ? "h5" : "h6"}
        fontWeight={800}
        sx={{ mt: 0.25, color: BRAND_PALETTE.charcoal }}
      >
        {formatMetricValue(metric, symbol)}
      </Typography>
      {sub ? (
        <Typography variant="caption" color="text.secondary">
          {sub}
        </Typography>
      ) : null}
    </Box>
  );
}

export type ListingRevenueCatMetricsPanelProps = {
  listingId: string | null | undefined;
  /** When false, do not fetch (e.g. no RevenueCat project linked). */
  enabled?: boolean;
  title?: string;
  /** Seller/owner only — reconnect copy is not shown to buyers. */
  isListingOwner?: boolean;
  /** Owners see a reconnect CTA when RevenueCat OAuth needs to be re-granted. */
  reconnectHref?: string;
};

export function ListingRevenueCatMetricsPanel(
  props: ListingRevenueCatMetricsPanelProps,
) {
  const {
    listingId,
    enabled = true,
    title = "Verified subscription metrics (RevenueCat)",
    isListingOwner = false,
    reconnectHref,
  } = props;
  const { getListingRevenueCatMetrics } = useListings();

  const lid = listingId ? String(listingId) : "";

  const q = useQuery<RcListingMetricsSnapshot>({
    queryKey: ["listing-rc-metrics", lid],
    queryFn: () => getListingRevenueCatMetrics(lid),
    enabled: Boolean(enabled && lid),
    staleTime: 60_000,
  });

  if (!lid || !enabled) return null;

  if (q.isError) {
    const code = errorCode(q.error);
    const payload = errorPayload(q.error);
    const needsReconnect =
      code === RC_NEEDS_RECONNECT ||
      Boolean(payload && payload.needsReconnect === true);

    if (needsReconnect) {
      if (!isListingOwner) {
        return (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            <AlertTitle sx={{ fontWeight: 800 }}>
              Verified revenue metrics unavailable
            </AlertTitle>
            This seller likely revoked this permission. Subscription metrics
            cannot be shown until they reconnect RevenueCat.
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
            RevenueCat needs to be reconnected
          </AlertTitle>
          The stored authorization expired or was revoked. Reconnect to resume
          verified subscription metrics.
        </Alert>
      );
    }
    return (
      <Alert severity="warning" sx={{ borderRadius: 2 }}>
        {(q.error as Error)?.message ?? "Could not load RevenueCat metrics."}
      </Alert>
    );
  }

  // `isPending` (not `isLoading`) so this is safe during SSR/hydration, where
  // react-query reports pending + idle (isLoading === false) with no data yet.
  if (q.isPending || !q.data) {
    return (
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          {title}
        </Typography>
        <Skeleton variant="rounded" height={300} sx={{ mt: 1 }} />
      </Paper>
    );
  }

  const data = q.data;
  const symbol = data.currencySymbol || "$";

  if (!data.metrics || data.metrics.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="subtitle1" fontWeight={800} gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          RevenueCat is connected, but this project has not reported any metrics
          yet.
        </Typography>
      </Paper>
    );
  }

  const byId = new Map(data.metrics.map((m) => [m.id, m]));
  const mrr = byId.get("mrr");

  // Emphasized money headline: MRR, derived ARR, trailing revenue.
  const moneyMetrics = data.metrics.filter((m) => isMoney(m.unit));
  const countMetrics = data.metrics.filter((m) => !isMoney(m.unit));

  const chartSource = COUNT_METRIC_IDS.map((id) => byId.get(id)).filter(
    (m): m is RevenueCatOverviewMetric => Boolean(m),
  );
  const chartMetrics = chartSource.length > 0 ? chartSource : countMetrics;

  const chartLabels = chartMetrics.map((m) => shortMetricLabel(m.name));
  const chartValues = chartMetrics.map((m) => m.value);

  const today = new Date().toLocaleDateString();

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
          <Stack direction="row" spacing={0.75} flexWrap="wrap" gap={0.75}>
            <Chip
              size="small"
              label="Verified via OAuth"
              variant="outlined"
              color="success"
            />
            {data.projectName ? (
              <Chip
                size="small"
                label={data.projectName}
                variant="outlined"
                color="secondary"
              />
            ) : null}
          </Stack>
        </Stack>

        {moneyMetrics.length > 0 || data.impliedArr != null ? (
          <Stack
            direction="row"
            flexWrap="wrap"
            gap={1}
            useFlexGap
            sx={{ width: "100%" }}
          >
            {mrr ? (
              <MetricTile metric={mrr} symbol={symbol} emphasized />
            ) : null}
            {data.impliedArr != null ? (
              <MetricTile
                metric={{
                  id: "implied_arr",
                  name: "Implied ARR",
                  unit: symbol,
                  value: data.impliedArr,
                  period: null,
                }}
                symbol={symbol}
                emphasized
              />
            ) : null}
            {moneyMetrics
              .filter((m) => m.id !== "mrr")
              .map((m) => (
                <MetricTile key={m.id} metric={m} symbol={symbol} emphasized />
              ))}
          </Stack>
        ) : null}

        {countMetrics.length > 0 ? (
          <Stack
            direction="row"
            flexWrap="wrap"
            gap={1}
            useFlexGap
            sx={{ width: "100%" }}
          >
            {countMetrics.map((m) => (
              <MetricTile key={m.id} metric={m} symbol={symbol} />
            ))}
          </Stack>
        ) : null}

        {chartValues.some((v) => v > 0) ? (
          <>
            <Divider />
            <Box sx={{ width: "100%", height: 280 }}>
              <BarChart
                height={280}
                series={[
                  {
                    data: chartValues,
                    label: "Subscribers and customers",
                    color: BRAND_PALETTE.seafoam,
                  },
                ]}
                xAxis={[
                  {
                    scaleType: "band",
                    data: chartLabels,
                    tickLabelStyle: { fontSize: 11 },
                  },
                ]}
                margin={{ left: 48, right: 12, top: 12, bottom: 48 }}
                grid={{ horizontal: true }}
                slotProps={{ legend: { hidden: true } }}
                sx={{
                  [`& .${barElementClasses.root}`]: {
                    fill: `url(#${RC_CHART_GRADIENT_ID})`,
                    rx: 4,
                    ry: 4,
                  },
                }}
              >
                <RcBarGradient />
              </BarChart>
            </Box>
          </>
        ) : null}

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", lineHeight: 1.45 }}
        >
          Verified metrics via RevenueCat as of {today}
          {data.lastUpdatedAtIso
            ? ` Last updated ${new Date(
                data.lastUpdatedAtIso,
              ).toLocaleString()}.`
            : ""}
        </Typography>
      </Stack>
    </Paper>
  );
}
