import express from "express";
import { getCustomerById } from "../controllers/customers/get-customer-by-id";
import { createCustomer } from "../controllers/customers/create-customer";
import { updateCustomer } from "../controllers/customers/update-customer";
import { deleteCustomer } from "../controllers/customers/delete-customer";
import { getOrdersByCustomerId } from "../controllers/orders/get-orders-by-customer-id";
import { signup } from "../controllers/customers/signup";
import { login } from "../controllers/customers/login";
import { createOrder } from "../controllers/orders/create-order";
import { refresh } from "../controllers/customers/refresh";
import { logout } from "../controllers/customers/logout";
import { authenticate } from "../middleware/auth";
import { enforceAccountStanding } from "../middleware/account-standing";
import { getMe } from "../controllers/customers/get-me";
import { patchMePreferences } from "../controllers/customers/patch-me-preferences";
import { confirmEmailVerified } from "../controllers/customers/confirm-email-verified";
import { deleteUserAccount } from "../controllers/customers/delete-user-account";
import { passwordReset } from "../controllers/customers/password-reset";

const router = express.Router();

//unprotected routes
router.post("/sign-up", signup);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.post("/password-reset", passwordReset);

// users - protected routes
router.use(authenticate);
router.get("/me", getMe);
router.delete("/me", deleteUserAccount);
router.post("/confirm-email-verified", confirmEmailVerified);
router.use(enforceAccountStanding);
router.patch("/me/preferences", patchMePreferences);
router.get("/customer/:id", getCustomerById);
router.post("/create-custoemr", createCustomer);
router.put("/customer/:id", updateCustomer);
router.delete("/customer/:id", deleteCustomer);

// orders
router.get("/customer/:id/orders", getOrdersByCustomerId);
router.post("/customer/:id/orders", createOrder);


export default router;