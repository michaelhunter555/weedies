import express from "express";
import { getAllCustomers } from "../controllers/customers/get-all-customers";
import { signIn } from "../controllers/admin/sign-in";
import { adminLogout } from "../controllers/admin/logout";
import { adminRefresh } from "../controllers/admin/refresh";
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

//unprotected routes
router.post("/login", signIn);
router.post("/refresh", adminRefresh);
router.post("/logout", adminLogout);

// admin - protected routes
router.use(authenticate, requireRole("admin"));
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