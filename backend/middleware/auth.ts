import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { verifyAccessToken, type AppRole } from "../lib/jwt";

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length) : undefined;

  if (!token) {
    return res
      .status(401)
      .json({ message: "Missing Authorization bearer token", code: "MISSING_TOKEN" });
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


