import express, { Router } from "express";
import getPubKey from "../controllers/stripe/getPubKey";
import appWebhook from "../controllers/stripe/webhooks/app-webhook";
import v2Webhook from "../controllers/stripe/webhooks/v2-webhook";
import createCheckoutSession from "../controllers/stripe/create-checkout-session";
import createConnectAccount from "../controllers/stripe/create-connect-account";
import refreshedOnboardingLink from "../controllers/stripe/refreshed-onboarding-link";
import deleteConnectedAccount from "../controllers/stripe/delete-connected-account";
import { authenticate } from "../middleware/auth";
import { enforceAccountStanding } from "../middleware/account-standing";
import { paymentUpdateLimiter } from "../middleware/rate-limiter";
import setupIntent from "../controllers/stripe/setup-intent";
import getPaymentMethods from "../controllers/customers/get-payment-methods";
import setDefaultPaymentMethod from "../controllers/customers/set-default-payment-method";
import deletePaymentMethods from "../controllers/customers/delete-payment-methods";
import handlePaymentIntent from "../controllers/sellers/handle-payment-intent";
import { getConnectBalance } from "../controllers/stripe/get-connect-balance";
import { getBillingHistory } from "../controllers/stripe/get-billing-history";

const router = Router();

// ── Public ──────────────────────────────────────────────────────────────
router.get("/get-stripe-pub", getPubKey);
router.get("/onboarding-cancelled", (req, res) => {
  return res.redirect("http://localhost:3000/onboarding-cancelled");
});
router.get("/onboarding-success", (req, res) => {
  return res.redirect("http://localhost:3000/onboarding-success");
});

// Webhooks need raw body — see `app.ts` (global JSON parser skips these full paths).
// Supported URLs (same handler; pick one in Stripe Dashboard):
//   POST /api/stripe/app-webhook   OR /api/stripe/app-webhooks  (platform / buyer events)
//   POST /api/stripe/v2-webhook    (Connect / seller events)
// Wrong paths (e.g. /api/stripe/webhook) hit `authenticate` → MISSING_TOKEN.
const rawJson = express.raw({ type: "application/json" });

router.post("/app-webhook", rawJson, appWebhook);
router.post("/app-webhooks", rawJson, appWebhook);
router.post("/v2-webhook", rawJson, v2Webhook);

// ── Protected ───────────────────────────────────────────────────────────
router.use(authenticate);
router.use(enforceAccountStanding);

// Payment methods
router.get("/payment-methods", getPaymentMethods);
router.get("/billing-history", getBillingHistory);
router.post(
  "/default-payment-method",
  paymentUpdateLimiter,
  setDefaultPaymentMethod,
);
router.post(
  "/delete-payment-methods",
  paymentUpdateLimiter,
  deletePaymentMethods,
);

router.post("/handle-payment-intent", paymentUpdateLimiter, handlePaymentIntent);

// Seller Connect balance (available / pending / reserved).
router.get("/connect-balance", getConnectBalance);

// SetupIntent - must run after `authenticate` so the controller can
// compare req.user.userId against the customer's owner.
router.post("/setup-intent", setupIntent);

// Buyer checkout — Checkout Session creates a PI with manual capture + Connect metadata
router.post("/create-checkout-session", paymentUpdateLimiter, createCheckoutSession);

// Seller Connect onboarding
router.post("/create-connect-account", paymentUpdateLimiter, createConnectAccount);
router.get("/refreshed-onboarding-link", paymentUpdateLimiter, refreshedOnboardingLink);

// Danger: test-only helper to wipe a seller's Connect account
router.delete("/delete-connected-account", paymentUpdateLimiter, deleteConnectedAccount);

export default router;
