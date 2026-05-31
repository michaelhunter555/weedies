import type { Request, Response } from "express";

import User from "../../models/user";

/** Whether the signed-in user has stored GA OAuth credentials (refresh token). */
export async function getGoogleAnalyticsConnectionStatus(
  req: Request,
  res: Response,
) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    const doc = (await User.findById(userId)
      .select("googleAnalyticsOAuth.refreshTokenEnc")
      .lean()) as {
      googleAnalyticsOAuth?: { refreshTokenEnc?: string | null };
    } | null;

    const connected = Boolean(
      doc?.googleAnalyticsOAuth?.refreshTokenEnc?.trim(),
    );

    return void res.status(200).json({ connected });
  } catch (err) {
    console.error("getGoogleAnalyticsConnectionStatus:", err);
    return void res.status(500).json({ message: "Failed to read GA status" });
  }
}
