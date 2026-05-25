import { Router } from "express";
import multer from "multer";
import { getAllListings } from "../controllers/listings/get-all-listings";
import { getListingById } from "../controllers/listings/get-listing-by-id";
import { createListing } from "../controllers/listings/create-listing";
import { saveDraftListing } from "../controllers/listings/save-draft-listing";
import { updateListing } from "../controllers/listings/update-listing";
import { deleteListing } from "../controllers/listings/delete-listing";
import { publishListing } from "../controllers/listings/publish-listing";
import { getMyAuctionBids } from "../controllers/listings/get-my-auction-bids";
import { getListingsBySeller } from "../controllers/listings/get-listings-by-seller";
import { getSellerListingEditMeta } from "../controllers/listings/get-seller-listing-edit-meta";
import { uploadListingPhotos } from "../controllers/listings/upload-photos";
import { placeAuctionBid } from "../controllers/listings/place-auction-bid";
import { setAuctionBidStatus } from "../controllers/listings/set-auction-bid-status";
import { getListingExchange } from "../controllers/listings/get-listing-exchange";
import { uploadExchangeDeliverables } from "../controllers/listings/upload-exchange-deliverables";
import { confirmListingExchange } from "../controllers/listings/confirm-listing-exchange";
import { submitExchangeReview } from "../controllers/listings/submit-exchange-review";
import { getListingReviews } from "../controllers/listings/get-listing-reviews";
import { authenticate, optionalAuthenticate } from "../middleware/auth";
import { getListingGoogleAnalyticsMetrics } from "../controllers/listings/get-listing-google-analytics-metrics";
import { getMyMarketplaceOrders } from "../controllers/listings/get-my-marketplace-orders";
import { requestPrivateListingAccess } from "../controllers/listings/request-private-listing-access";
import { resolvePrivateListingAccess } from "../controllers/listings/resolve-private-listing-access";
import { writeLimiter } from "../middleware/rate-limiter";

const router = Router();

// In-memory multer for photo uploads - we stream buffers straight to
// Cloudinary and never touch local disk.
const exchangeDeliverableUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 12,
    /** Logos, NDAs, small docs — not full app bundles (use offline transfer). */
    fileSize: 8 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const ok =
      /^image\/(png|jpe?g|webp|gif)$/i.test(file.mimetype) ||
      /^application\/pdf$/i.test(file.mimetype) ||
      /^text\/plain$/i.test(file.mimetype);
    if (ok) {
      cb(null, true);
    } else {
      cb(new Error("Allowed types: PNG, JPG, WEBP, GIF, PDF, or plain text"));
    }
  },
});

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 6,
    // Screenshots from macOS / iOS / Android can easily reach 8–10MB before
    // compression. Keep a generous ceiling but still high enough to block a
    // misbehaving client from flooding the server.
    fileSize: 15 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(png|jpe?g|webp|gif)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PNG, JPG, WEBP or GIF images are allowed"));
    }
  },
});

// ── Public ──────────────────────────────────────────────────────────────
router.get("/", optionalAuthenticate, getAllListings);
router.get(
  "/:id/google-analytics/metrics",
  optionalAuthenticate,
  getListingGoogleAnalyticsMetrics,
);
router.get("/:id/reviews", getListingReviews);
router.get("/:id", optionalAuthenticate, getListingById);
// ── Protected ───────────────────────────────────────────────────────────
router.use(authenticate);

router.get("/exchange/:listingId", getListingExchange);
router.post(
  "/exchange/:listingId/deliverables",
  writeLimiter,
  exchangeDeliverableUpload.array("files", 12),
  uploadExchangeDeliverables,
);
router.post("/exchange/:listingId/confirm", writeLimiter, confirmListingExchange);
router.post("/exchange/:listingId/review", writeLimiter, submitExchangeReview);

router.get("/me/mine", getListingsBySeller);
router.get("/me/marketplace-orders", getMyMarketplaceOrders);
router.get("/me/auction-bids", getMyAuctionBids);
router.get("/me/edit-meta", getSellerListingEditMeta);
router.post("/draft", writeLimiter, saveDraftListing);
router.post("/", writeLimiter, createListing);
router.post(
  "/upload-photos",
  writeLimiter,
  photoUpload.array("photos", 6),
  uploadListingPhotos,
);
router.patch("/:id/bids/:bidId", writeLimiter, setAuctionBidStatus);
router.patch("/:id", writeLimiter, updateListing);
router.delete("/:id", writeLimiter, deleteListing);
router.post("/:id/publish", writeLimiter, publishListing);
router.post("/:id/bids", writeLimiter, placeAuctionBid);
router.post("/:id/private-access/request", writeLimiter, requestPrivateListingAccess);
router.patch(
  "/:id/private-access/:requestId",
  writeLimiter,
  resolvePrivateListingAccess,
);

export default router;
