/**
 * GA4 Data API (runReport) helpers.
 * @see https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport
 */

export type GaDailySessionsPoint = {
  /** ISO calendar date `YYYY-MM-DD` */
  date: string;
  sessions: number;
};

export type GaListingMetricsPayload = {
  dailySessions: GaDailySessionsPoint[];
  /** 0–1 (GA4 `bounceRate` metric) */
  bounceRate: number;
  /** Seconds (GA4 `averageSessionDuration`) */
  averageSessionDurationSeconds: number;
  totalSessions: number;
};

type RunReportResponse = {
  dimensionHeaders?: { name?: string }[];
  metricHeaders?: { name?: string; type?: string }[];
  rows?: {
    dimensionValues?: { value?: string }[];
    metricValues?: { value?: string }[];
  }[];
};

function num(v: string | undefined): number {
  if (v == null || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function gaDateToIso(ga: string): string {
  const s = String(ga ?? "").replace(/\D/g, "");
  if (s.length !== 8) return String(ga ?? "");
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

function readMetricRow(
  row:
    | { metricValues?: { value?: string }[] }
    | undefined,
  headers: RunReportResponse["metricHeaders"],
): Record<string, number> {
  const out: Record<string, number> = {};
  const names = (headers ?? []).map((h) => String(h.name ?? ""));
  const vals = row?.metricValues ?? [];
  names.forEach((name, i) => {
    if (name) out[name] = num(vals[i]?.value);
  });
  return out;
}

export async function fetchGa4ListingMetrics(
  accessToken: string,
  propertyResourceName: string,
): Promise<GaListingMetricsPayload> {
  const trimmed = propertyResourceName.trim();
  const propertyId = trimmed.startsWith("properties/")
    ? trimmed.slice("properties/".length)
    : trimmed;
  if (!propertyId) {
    throw new Error("Missing GA4 property id");
  }
  /** Path must use a real `/` between `properties` and the id; encoding `properties/123` breaks routing (404 HTML). */
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(
    propertyId,
  )}:runReport`;

  const range = {
    startDate: "30daysAgo",
    endDate: "today",
  } as const;

  const [dailyRes, summaryRes] = await Promise.all([
    fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [range],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ dimension: { dimensionName: "date" } }],
        keepEmptyRows: false,
      }),
    }),
    fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [range],
        metrics: [
          { name: "sessions" },
          { name: "bounceRate" },
          { name: "averageSessionDuration" },
        ],
      }),
    }),
  ]);

  if (!dailyRes.ok) {
    const t = await dailyRes.text();
    throw new Error(`GA4 daily report failed (${dailyRes.status}): ${t.slice(0, 400)}`);
  }
  if (!summaryRes.ok) {
    const t = await summaryRes.text();
    throw new Error(`GA4 summary report failed (${summaryRes.status}): ${t.slice(0, 400)}`);
  }

  const dailyJson = (await dailyRes.json()) as RunReportResponse;
  const summaryJson = (await summaryRes.json()) as RunReportResponse;

  const dailySessions: GaDailySessionsPoint[] = [];
  for (const row of dailyJson.rows ?? []) {
    const rawDate = row.dimensionValues?.[0]?.value ?? "";
    dailySessions.push({
      date: gaDateToIso(rawDate),
      sessions: num(row.metricValues?.[0]?.value),
    });
  }

  const mh = summaryJson.metricHeaders;
  const sumRow = summaryJson.rows?.[0];
  const byName = readMetricRow(sumRow, mh);

  return {
    dailySessions,
    totalSessions: byName.sessions ?? 0,
    bounceRate: byName.bounceRate ?? 0,
    averageSessionDurationSeconds: byName.averageSessionDuration ?? 0,
  };
}
