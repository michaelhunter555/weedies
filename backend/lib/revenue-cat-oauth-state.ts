import * as jwt from "jsonwebtoken";
import mongoose from "mongoose";

const PURPOSE = "revenuecat_oauth" as const;

export type RevenueCatOAuthStatePayload = {
  purpose: typeof PURPOSE;
  sub: string;
  listingId?: string;
};

function mustSecret() {
  const s = process.env.JWT_ACCESS_SECRET;
  if (!s) throw new Error("Missing JWT_ACCESS_SECRET env var");
  return s;
}

export function signRevenueCatOAuthState(userId: string, listingId?: string) {
  const secret = mustSecret();
  const expiresIn = 600;
  const lid = listingId?.trim();
  const payload: RevenueCatOAuthStatePayload = {
    purpose: PURPOSE,
    sub: userId,
    ...(lid && mongoose.isValidObjectId(lid) ? { listingId: lid } : {}),
  };
  return jwt.sign(payload, secret, { expiresIn });
}

export function verifyRevenueCatOAuthState(
  token: string,
): RevenueCatOAuthStatePayload {
  const secret = mustSecret();
  const decoded = jwt.verify(token, secret) as RevenueCatOAuthStatePayload;
  if (decoded?.purpose !== PURPOSE || !decoded.sub) {
    throw new Error("Invalid OAuth state");
  }
  return decoded;
}
