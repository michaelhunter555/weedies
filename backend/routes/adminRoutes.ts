import express from "express";
import multer from "multer";
import { getAllCustomers } from "../controllers/customers/get-all-customers";
import { signIn } from "../controllers/admin/sign-in";
import { adminLogout } from "../controllers/admin/logout";
import { adminRefresh } from "../controllers/admin/refresh";
import {
  getActiveListings,
  getPendingListings,
} from "../controllers/admin/listings/get-admin-listings";
import { getAdminListingById } from "../controllers/admin/listings/get-admin-listing-by-id";
import { moderateListing } from "../controllers/admin/listings/moderate-listing";
import { createPlatformListing } from "../controllers/admin/listings/create-platform-listing";
import { updatePlatformListing } from "../controllers/admin/listings/update-platform-listing";
import { uploadPlatformListingPhotos } from "../controllers/admin/listings/upload-platform-listing-photos";
import { getAdminDisputes } from "../controllers/admin/disputes/get-admin-disputes";
import { getAdminDisputeById } from "../controllers/admin/disputes/get-admin-dispute-by-id";
import { adminDisputeDecision } from "../controllers/admin/disputes/dispute-decision";
import { getAdminTransactions } from "../controllers/admin/transactions/get-admin-transactions";
import adminChatRoutes from "./adminChatRoutes";
import { attachPlatformOwnerChatActor } from "../middleware/admin-platform-owner-chat";
import { getAllOrders } from "../controllers/orders/get-all-orders";
import { getAllProducts } from "../controllers/products/get-all-products";
import { getAllReviews } from "../controllers/reviews/get-all-review";
import { createProduct } from "../controllers/products/create-product";
import { updateProduct } from "../controllers/products/update-product";
import { deleteProduct } from "../controllers/products/delete-product";
import { createOrder } from "../controllers/orders/create-order";
import { updateOrder } from "../controllers/orders/update-order";
import { deleteOrder } from "../controllers/orders/delete-order";
import { authenticate, requireRole } from "../middleware/auth";
const router = express.Router();

const platformPhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 6, fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(png|jpe?g|webp|gif)$/i.test(file.mimetype);
    if (ok) {
      cb(null, true);
    } else {
      cb(new Error("Only PNG, JPG, WEBP, or GIF images are allowed"));
    }
  },
});

//unprotected routes
router.post("/login", signIn);
router.post("/refresh", adminRefresh);
router.post("/logout", adminLogout);

// admin - protected routes
router.use(authenticate, requireRole("admin"));
router.get("/listings/pending", getPendingListings);
router.get("/listings/active", getActiveListings);
router.get("/listings/:listingId", getAdminListingById);
router.patch("/listings/:listingId/review", moderateListing);
router.post("/platform-listings", createPlatformListing);
router.patch("/platform-listings/:listingId", updatePlatformListing);
router.post(
  "/platform-listings/upload-photos",
  platformPhotoUpload.array("photos", 6),
  uploadPlatformListingPhotos,
);
router.get("/transactions", getAdminTransactions);
router.get("/disputes", getAdminDisputes);
router.patch("/disputes/:disputeId/decision", adminDisputeDecision);
router.get("/disputes/:disputeId", getAdminDisputeById);
router.use("/chats", attachPlatformOwnerChatActor, adminChatRoutes);
router.get("/customers", getAllCustomers);
router.get("/products", getAllProducts);
router.get("/orders", getAllOrders);
router.get("/reviews", getAllReviews);

// products - protected routes
router.post("/", createProduct);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

//orders - protected routes
router.post("/order", createOrder);
router.put("/order/:id", updateOrder);
router.delete("/order/:id", deleteOrder);

export default router;