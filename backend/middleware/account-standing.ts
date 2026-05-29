import type { NextFunction, Request, Response } from "express";

import User from "../models/user";
import {
  AccountStatus,
  isRestrictedStanding,
} from "../types/account-status";

/** Paths restricted users may still call after `authenticate`. */
const STANDING_EXEMPT_PREFIXES = [
  "/api/user/me",
  "/api/user/logout",
  "/api/user/refresh",
];

function isStandingExempt(req: Request): boolean {
  const path = (req.originalUrl || req.url || "").split("?")[0];
  return STANDING_EXEMPT_PREFIXES.some((p) => path.startsWith(p));
}

/**
 * Blocks suspended/banned users from marketplace APIs while still allowing
 * profile read (`/user/me`) and session teardown.
 */
export async function enforceAccountStanding(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.user?.userId) {
    return next();
  }
  if (isStandingExempt(req)) {
    return next();
  }

  try {
    const row = (await User.findById(req.user.userId)
      .select("accountStanding")
      .lean()) as { accountStanding?: string } | null;

    const standing = row?.accountStanding ?? AccountStatus.GOOD;
    if (!isRestrictedStanding(standing)) {
      return next();
    }

    const code =
      standing === AccountStatus.BANNED ? "ACCOUNT_BANNED" : "ACCOUNT_SUSPENDED";

    return res.status(403).json({
      message:
        standing === AccountStatus.BANNED
          ? "This account has been banned."
          : "This account is suspended.",
      code,
      accountStanding: standing,
    });
  } catch (err) {
    console.error("enforceAccountStanding:", err);
    return res.status(500).json({ message: "Could not verify account status." });
  }
}
