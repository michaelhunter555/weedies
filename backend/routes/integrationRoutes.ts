import express from "express";
import { authenticate } from "../middleware/auth";
import { enforceAccountStanding } from "../middleware/account-standing";
import { startGoogleAnalyticsOAuth } from "../controllers/integrations/start-google-analytics-oauth";
import { googleAnalyticsOAuthCallback } from "../controllers/integrations/google-analytics-oauth-callback";
import { listGoogleAnalyticsProperties } from "../controllers/integrations/list-google-analytics-properties";
import { linkGoogleAnalyticsToListing } from "../controllers/integrations/link-google-analytics-to-listing";
import { getGoogleAnalyticsConnectionStatus } from "../controllers/integrations/get-google-analytics-status";
import { disconnectGoogleAnalytics } from "../controllers/integrations/disconnect-google-analytics";
import { listRevenueCatProjects } from "../controllers/integrations/list-revenuecat-projects";
import { linkRevenueCatToListing } from "../controllers/integrations/link-revenuecat-to-listing";
import { startRevenueCatOAuth } from "../controllers/integrations/start-revenue-cat-oauth";
import { revenueCatOAuthCallback } from "../controllers/integrations/revenue-cat-oauth-callback";
import { getRevenueCatConnectionStatus } from "../controllers/integrations/get-revenue-cat-status";
import { disconnectRevenueCat } from "../controllers/integrations/disconnect-revenue-cat";

const router = express.Router();

/** Browser redirect from Google - no Authorization header. */
router.get("/google-analytics/callback", googleAnalyticsOAuthCallback);
router.get("/revenuecat/callback", revenueCatOAuthCallback);

router.use(authenticate);
router.use(enforceAccountStanding);
router.get("/google-analytics/start", startGoogleAnalyticsOAuth);
router.get("/google-analytics/status", getGoogleAnalyticsConnectionStatus);
router.post("/google-analytics/disconnect", disconnectGoogleAnalytics);
router.get("/google-analytics/properties", listGoogleAnalyticsProperties);
router.post("/google-analytics/link-listing", linkGoogleAnalyticsToListing);
router.get("/revenuecat/start", startRevenueCatOAuth);
router.get("/revenuecat/status", getRevenueCatConnectionStatus);
router.post("/revenuecat/disconnect", disconnectRevenueCat);
router.get("/revenuecat/projects", listRevenueCatProjects);
router.post("/revenuecat/link-listing", linkRevenueCatToListing);

export default router;
