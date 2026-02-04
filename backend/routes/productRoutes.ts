import express from "express";
import { getAllProducts } from "../controllers/products/get-all-products";
import { getProductById } from "../controllers/products/get-product-by-id";
import { createProduct } from "../controllers/products/create-product";
import { updateProduct } from "../controllers/products/update-product";
import { deleteProduct } from "../controllers/products/delete-product";
import { createReview } from "../controllers/reviews/create-review";
import { getReviewsByProductId } from "../controllers/reviews/get-reviews-by-product-id";
import { deleteReview } from "../controllers/reviews/delete-review";
import { getReviewById } from "../controllers/reviews/get-review-by-id";


const router = express.Router();

// products - public routes
router.get("/", getAllProducts);
router.get("/:id", getProductById);

// reviews - public routes
router.get("/:id/reviews", getReviewsByProductId);
router.get("/:id/reviews/:reviewId", getReviewById);

// reviews - protected routes
router.post("/:id/reviews", createReview);
router.delete("/:id/reviews/:reviewId", deleteReview);


export default router;