import type { Request, Response } from "express";
import {
  RC_NEEDS_RECONNECT,
  getValidRevenueCatAccessToken,
  RevenueCatReconnectError,
} from "../../lib/revenue-cat-access-token";
import { revenueCatApiGet } from "../../lib/revenue-cat-oauth-api";

type RcProjectItem = {
  object?: string;
  id?: string;
  name?: string;
  created_at?: number;
  icon_url?: string;
};

type RcProjectListResponse = {
  object?: string;
  items?: RcProjectItem[];
};

export async function listRevenueCatProjects(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    const accessToken = await getValidRevenueCatAccessToken(userId);
    const data = await revenueCatApiGet<RcProjectListResponse>(
      "/v2/projects?limit=50",
      accessToken,
    );

    const projects = (data.items ?? [])
      .filter((row) => row.id)
      .map((row) => ({
        id: String(row.id),
        name: row.name?.trim() || String(row.id),
        description: row.icon_url ? "RevenueCat project" : undefined,
      }));

    return void res.status(200).json({ projects });
  } catch (err) {
    if (err instanceof RevenueCatReconnectError) {
      return void res.status(412).json({
        message: err.message,
        code: RC_NEEDS_RECONNECT,
      });
    }
    console.error("listRevenueCatProjects:", err);
    return void res.status(500).json({ message: "Failed to list RevenueCat projects" });
  }
}
