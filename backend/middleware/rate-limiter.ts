import rateLimit from "express-rate-limit";

/**
 * Stricter limiter for destructive or money-moving endpoints
 * (Stripe onboarding refresh, account deletion, checkout session creation, …).
 */
export const paymentUpdateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many payment requests — please slow down." },
});

/**
 * Generic limiter for public-facing write endpoints (listing creation,
 * review creation, signup, etc.).
 */
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many requests — please try again shortly." },
});
