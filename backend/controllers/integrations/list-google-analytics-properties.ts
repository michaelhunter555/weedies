import type { Request, Response } from "express";

import { getValidGoogleAnalyticsAccessToken } from "../../lib/google-analytics-access-token";

export type GaPropertyRow = {
  id: string;
  accountDisplayName: string;
  propertyDisplayName: string;
  propertyResourceName: string;
};

type AccountSummary = {
  displayName?: string;
  propertySummaries?: Array<{
    property?: string;
    displayName?: string;
  }>;
};

/**
 * Lists GA4 properties the user can access (flattened for a picker grid).
 * @see https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/accountSummaries/list
 */
export async function listGoogleAnalyticsProperties(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    const accessToken = await getValidGoogleAnalyticsAccessToken(userId);

    const url = new URL(
      "https://analyticsadmin.googleapis.com/v1beta/accountSummaries",
    );
    url.searchParams.set("pageSize", "200");

    const gRes = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!gRes.ok) {
      const text = await gRes.text();
      console.error("GA Admin API error:", gRes.status, text);
      return void res.status(502).json({
        message: "Google Analytics Admin API request failed.",
        details: text.slice(0, 500),
      });
    }

    const body = (await gRes.json()) as {
      accountSummaries?: AccountSummary[];
    };

    const rows: GaPropertyRow[] = [];
    for (const acct of body.accountSummaries ?? []) {
      const accountDisplayName = String(acct.displayName ?? "Account");
      for (const ps of acct.propertySummaries ?? []) {
        const propertyResourceName = String(ps.property ?? "");
        if (!propertyResourceName.startsWith("properties/")) continue;
        rows.push({
          id: propertyResourceName,
          accountDisplayName,
          propertyDisplayName: String(ps.displayName ?? propertyResourceName),
          propertyResourceName,
        });
      }
    }

    return void res.status(200).json({ properties: rows });
  } catch (err) {
    console.error("listGoogleAnalyticsProperties:", err);
    const message =
      err instanceof Error ? err.message : "Failed to list GA4 properties";
    return void res.status(400).json({ message });
  }
}
