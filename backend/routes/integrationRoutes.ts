import express from "express";
import { authenticate } from "../middleware/auth";
import { enforceAccountStanding } from "../middleware/account-standing";
import { startGoogleAnalyticsOAuth } from "../controllers/integrations/start-google-analytics-oauth";
import { googleAnalyticsOAuthCallback } from "../controllers/integrations/google-analytics-oauth-callback";
import { listGoogleAnalyticsProperties } from "../controllers/integrations/list-google-analytics-properties";
import { linkGoogleAnalyticsToListing } from "../controllers/integrations/link-google-analytics-to-listing";
import { listRevenueCatProjects } from "../controllers/integrations/list-revenuecat-projects";
import { linkRevenueCatToListing } from "../controllers/integrations/link-revenuecat-to-listing";

const router = express.Router();

/** Browser redirect from Google - no Authorization header. */
router.get("/google-analytics/callback", googleAnalyticsOAuthCallback);

router.use(authenticate);
router.use(enforceAccountStanding);
router.get("/google-analytics/start", startGoogleAnalyticsOAuth);
router.get("/google-analytics/properties", listGoogleAnalyticsProperties);
router.post("/google-analytics/link-listing", linkGoogleAnalyticsToListing);
router.get("/revenuecat/projects", listRevenueCatProjects);
router.post("/revenuecat/link-listing", linkRevenueCatToListing);

export default router;
