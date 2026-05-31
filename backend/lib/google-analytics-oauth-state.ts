import * as jwt from "jsonwebtoken";
import mongoose from "mongoose";

const PURPOSE = "ga_analytics_oauth" as const;

export type GoogleAnalyticsOAuthStatePayload = {
  purpose: typeof PURPOSE;
  sub: string;
  listingId?: string;
};

function mustSecret() {
  const s = process.env.JWT_ACCESS_SECRET;
  if (!s) throw new Error("Missing JWT_ACCESS_SECRET env var");
  return s;
}

/** Short-lived JWT carried as OAuth `state` (callback is unauthenticated). */
export function signGoogleAnalyticsOAuthState(
  userId: string,
  listingId?: string,
) {
  const secret = mustSecret();
  const expiresIn = 600; // 10 minutes
  const lid = listingId?.trim();
  const payload: GoogleAnalyticsOAuthStatePayload = {
    purpose: PURPOSE,
    sub: userId,
    ...(lid && mongoose.isValidObjectId(lid) ? { listingId: lid } : {}),
  };
  return jwt.sign(payload, secret, { expiresIn });
}

export function verifyGoogleAnalyticsOAuthState(
  token: string,
): GoogleAnalyticsOAuthStatePayload {
  const secret = mustSecret();
  const decoded = jwt.verify(
    token,
    secret,
  ) as GoogleAnalyticsOAuthStatePayload;
  if (decoded?.purpose !== PURPOSE || !decoded.sub) {
    throw new Error("Invalid OAuth state");
  }
  return decoded;
}
