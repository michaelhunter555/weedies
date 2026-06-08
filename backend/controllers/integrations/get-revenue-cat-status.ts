import type { Request, Response } from "express";
import User from "../../models/user";

export async function getRevenueCatConnectionStatus(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    const doc = (await User.findById(userId)
      .select("revenueCatOAuth.refreshTokenEnc")
      .lean()) as {
      revenueCatOAuth?: { refreshTokenEnc?: string | null };
    } | null;

    const connected = Boolean(doc?.revenueCatOAuth?.refreshTokenEnc?.trim());

    return void res.status(200).json({ connected });
  } catch (err) {
    console.error("getRevenueCatConnectionStatus:", err);
    return void res.status(500).json({ message: "Failed to read RevenueCat status" });
  }
}
