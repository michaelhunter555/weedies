import type { Request, Response } from "express";

/**
 * Placeholder until RevenueCat OAuth / API keys exist.
 * Frontend can show an empty DataGrid with a “coming soon” overlay.
 */
export async function listRevenueCatProjects(_req: Request, res: Response) {
  return void res.status(200).json({
    projects: [] as Array<{
      id: string;
      name: string;
      description?: string;
    }>,
  });
}
