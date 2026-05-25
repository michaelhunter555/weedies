import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { verifyAccessToken, type AppRole } from "../lib/jwt";

/**
 * When a Bearer token is present and valid, attaches `req.user`.
 * Invalid or expired tokens are ignored so the request continues anonymously.
 */
export function optionalAuthenticate(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length) : undefined;

  if (!token) {
    return next();
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { userId: payload.sub, role: payload.role };
  } catch {
    // ignore - treat as anonymous (used for public endpoints that unlock extra
    // data for the resource owner, e.g. GA4 metrics before a listing is live).
  }
  return next();
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length) : undefined;

  if (!token) {
    const path = (req.originalUrl || req.url || "").split("?")[0].replace(/\/+$/, "") || "/";
    const validStripeWebhookPaths = new Set([
      "/api/stripe/app-webhook",
      "/api/stripe/app-webhooks",
      "/api/stripe/v2-webhook",
    ]);
    const looksLikeMisconfiguredStripeWebhook =
      req.method === "POST" &&
      path.includes("stripe") &&
      path.includes("webhook") &&
      !validStripeWebhookPaths.has(path);

    return res.status(401).json({
      message: "Missing Authorization bearer token",
      code: "MISSING_TOKEN",
      ...(looksLikeMisconfiguredStripeWebhook
        ? {
            hint:
              "Stripe webhooks must POST to /api/stripe/app-webhook or /api/stripe/app-webhooks (same handler), or /api/stripe/v2-webhook for Connect. No Authorization header. Generic paths like /api/stripe/webhook will not work.",
          }
        : {}),
    });
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { userId: payload.sub, role: payload.role };
    return next();
  } catch (err) {
    // Tag expired vs malformed/invalid distinctly so the client can decide
    // whether to attempt a refresh-and-retry.
    if (err instanceof jwt.TokenExpiredError) {
      return res
        .status(401)
        .json({ message: "Access token expired", code: "EXPIRED_TOKEN" });
    }
    return res
      .status(401)
      .json({ message: "Invalid token", code: "INVALID_TOKEN" });
  }
}

export function requireRole(role: AppRole) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role !== role) return res.status(403).json({ message: "Forbidden" });
    return next();
  };
}


