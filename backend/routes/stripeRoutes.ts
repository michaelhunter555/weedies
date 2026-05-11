import express, { Router } from "express";
import getPubKey from "../controllers/stripe/getPubKey";
import appWebhook from "../controllers/stripe/webhooks/app-webhook";
import v2Webhook from "../controllers/stripe/webhooks/v2-webhook";
import createCheckoutSession from "../controllers/stripe/create-checkout-session";
import createConnectAccount from "../controllers/stripe/create-connect-account";
import refreshedOnboardingLink from "../controllers/stripe/refreshed-onboarding-link";
import deleteConnectedAccount from "../controllers/stripe/delete-connected-account";
import { authenticate } from "../middleware/auth";
import { paymentUpdateLimiter } from "../middleware/rate-limiter";
import setupIntent from "../controllers/stripe/setup-intent";
import getPaymentMethods from "../controllers/customers/get-payment-methods";

const router = Router();

// ── Public ──────────────────────────────────────────────────────────────
router.get("/get-stripe-pub", getPubKey);
router.get("/onboarding-cancelled", (req, res) => {
  return res.redirect("http://localhost:3000/onboarding-cancelled");
});
router.get("/onboarding-success", (req, res) => {
  return res.redirect("http://localhost:3000/onboarding-success");
});

// Webhooks need raw body (matched in app.ts where express.json() is skipped
// for these exact URLs).
router.post(
  "/app-webhook",
  express.raw({ type: "application/json" }),
  appWebhook,
);
router.post(
  "/v2-webhook",
  express.raw({ type: "application/json" }),
  v2Webhook,
);

// ── Protected ───────────────────────────────────────────────────────────
router.use(authenticate);

// Payment methods
router.get("/payment-methods", getPaymentMethods);

// SetupIntent — must run after `authenticate` so the controller can
// compare req.user.userId against the customer's owner.
router.post("/setup-intent", setupIntent);

// Buyer checkout
router.post("/create-checkout-session", paymentUpdateLimiter, createCheckoutSession);

// Seller Connect onboarding
router.post("/create-connect-account", paymentUpdateLimiter, createConnectAccount);
router.get("/refreshed-onboarding-link", paymentUpdateLimiter, refreshedOnboardingLink);

// Danger: test-only helper to wipe a seller's Connect account
router.delete("/delete-connected-account", paymentUpdateLimiter, deleteConnectedAccount);

export default router;
