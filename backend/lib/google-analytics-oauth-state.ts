import * as jwt from "jsonwebtoken";

const PURPOSE = "ga_analytics_oauth" as const;

export type GoogleAnalyticsOAuthStatePayload = {
  purpose: typeof PURPOSE;
  sub: string;
};

function mustSecret() {
  const s = process.env.JWT_ACCESS_SECRET;
  if (!s) throw new Error("Missing JWT_ACCESS_SECRET env var");
  return s;
}

/** Short-lived JWT carried as OAuth `state` (callback is unauthenticated). */
export function signGoogleAnalyticsOAuthState(userId: string) {
  const secret = mustSecret();
  const expiresIn = 600; // 10 minutes
  const payload: GoogleAnalyticsOAuthStatePayload = {
    purpose: PURPOSE,
    sub: userId,
  };
  return jwt.sign(payload, secret, { expiresIn });
}

export function verifyGoogleAnalyticsOAuthState(token: string) {
  const secret = mustSecret();
  const decoded = jwt.verify(token, secret) as GoogleAnalyticsOAuthStatePayload;
  if (decoded?.purpose !== PURPOSE || !decoded.sub) {
    throw new Error("Invalid OAuth state");
  }
  return decoded.sub;
}
