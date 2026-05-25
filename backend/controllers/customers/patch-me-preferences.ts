import type { Request, Response } from "express";
import User from "../../models/user";
import { applyUserLocaleFields } from "../../lib/user-locale";
import { toAppUserJson } from "../../lib/serialize-app-user";

/**
 * Persist browser timezone / locale for the signed-in user.
 */
export async function patchMePreferences(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return void res.status(404).json({ message: "User not found" });
    }

    const changed = applyUserLocaleFields(user, req.body ?? {});
    if (!changed) {
      return void res.status(400).json({
        message: "Provide timezone and/or locale to update.",
      });
    }

    await user.save();
    return void res.status(200).json({ user: toAppUserJson(user) });
  } catch (err) {
    console.log("patchMePreferences error:", err);
    return void res.status(500).json({ message: "Failed to update preferences" });
  }
}
