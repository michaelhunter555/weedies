import { revenueCatApiGet } from "./revenue-cat-oauth-api";

/**
 * RevenueCat v2 "overview metrics" snapshot for a project.
 * GET /v2/projects/{project_id}/metrics/overview (scope charts_metrics:overview:read).
 */
type RcOverviewMetricRaw = {
  object?: string;
  id?: string;
  name?: string;
  description?: string;
  unit?: string;
  period?: string;
  value?: number;
  last_updated_at?: number;
  last_updated_at_iso8601?: string;
};

type RcOverviewMetricsRaw = {
  object?: string;
  metrics?: RcOverviewMetricRaw[];
};

type RcProjectRaw = {
  id?: string;
  name?: string;
};

export type RevenueCatOverviewMetric = {
  id: string;
  name: string;
  /** "$" for money metrics, "#" for counts (per RevenueCat). */
  unit: string;
  value: number;
  period: string | null;
};

export type RevenueCatListingMetricsSnapshot = {
  projectName: string | null;
  metrics: RevenueCatOverviewMetric[];
  /** Derived from the `mrr` metric (MRR x 12) when present. */
  impliedArr: number | null;
  /** Money symbol from the first money-unit metric (best effort). */
  currencySymbol: string;
  lastUpdatedAtIso: string | null;
};

const NUMERIC_ID_ORDER = [
  "mrr",
  "active_subscriptions",
  "active_trials",
  "revenue",
  "new_customers",
  "active_users",
];

function orderRank(id: string): number {
  const i = NUMERIC_ID_ORDER.indexOf(id);
  return i === -1 ? NUMERIC_ID_ORDER.length : i;
}

async function fetchProjectName(
  accessToken: string,
  projectId: string,
): Promise<string | null> {
  try {
    const project = await revenueCatApiGet<RcProjectRaw>(
      `/v2/projects/${encodeURIComponent(projectId)}`,
      accessToken,
    );
    return project.name?.trim() || null;
  } catch {
    return null;
  }
}

export async function fetchRevenueCatListingMetrics(params: {
  accessToken: string;
  projectId: string;
}): Promise<RevenueCatListingMetricsSnapshot> {
  const { accessToken, projectId } = params;

  const [overview, projectName] = await Promise.all([
    revenueCatApiGet<RcOverviewMetricsRaw>(
      `/v2/projects/${encodeURIComponent(projectId)}/metrics/overview`,
      accessToken,
    ),
    fetchProjectName(accessToken, projectId),
  ]);

  const metrics: RevenueCatOverviewMetric[] = (overview.metrics ?? [])
    .filter((m) => typeof m.id === "string" && typeof m.value === "number")
    .map((m) => ({
      id: String(m.id),
      name: m.name?.trim() || String(m.id),
      unit: typeof m.unit === "string" && m.unit ? m.unit : "#",
      value: Number(m.value),
      period: m.period ?? null,
    }))
    .sort((a, b) => orderRank(a.id) - orderRank(b.id));

  const mrr = metrics.find((m) => m.id === "mrr");
  const impliedArr = mrr ? Number((mrr.value * 12).toFixed(2)) : null;

  const moneyMetric = metrics.find((m) => m.unit && m.unit !== "#");
  const currencySymbol = moneyMetric?.unit || "$";

  const lastUpdatedAtIso =
    (overview.metrics ?? []).find((m) => m.last_updated_at_iso8601)
      ?.last_updated_at_iso8601 ?? null;

  return {
    projectName,
    metrics,
    impliedArr,
    currencySymbol,
    lastUpdatedAtIso,
  };
}
