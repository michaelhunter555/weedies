import { Router } from "express";
import multer from "multer";
import { getAllListings } from "../controllers/listings/get-all-listings";
import { getListingById } from "../controllers/listings/get-listing-by-id";
import { createListing } from "../controllers/listings/create-listing";
import { updateListing } from "../controllers/listings/update-listing";
import { deleteListing } from "../controllers/listings/delete-listing";
import { publishListing } from "../controllers/listings/publish-listing";
import { getListingsBySeller } from "../controllers/listings/get-listings-by-seller";
import { uploadListingPhotos } from "../controllers/listings/upload-photos";
import { authenticate } from "../middleware/auth";
import { writeLimiter } from "../middleware/rate-limiter";

const router = Router();

// In-memory multer for photo uploads — we stream buffers straight to
// Cloudinary and never touch local disk.
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
router.get("/", getAllListings);
router.get("/:id", getListingById);
// ── Protected ───────────────────────────────────────────────────────────
router.use(authenticate);

router.get("/me/mine", getListingsBySeller);
router.post("/", writeLimiter, createListing);
router.post(
  "/upload-photos",
  writeLimiter,
  photoUpload.array("photos", 6),
  uploadListingPhotos,
);
router.patch("/:id", writeLimiter, updateListing);
router.delete("/:id", writeLimiter, deleteListing);
router.post("/:id/publish", writeLimiter, publishListing);

export default router;
