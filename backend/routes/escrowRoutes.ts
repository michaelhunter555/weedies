import express from "express";

import { cancelEscrowTransaction } from "../controllers/escrow/cancel-escrow-transaction";
import { initEscrowTransaction } from "../controllers/escrow/create-escrow-transaction";
import { escrowWebhook } from "../controllers/escrow/escrow-webhook";
import { getEscrowTransactionStatus } from "../controllers/escrow/get-escrow-transaction";
import { registerEscrowWebhookHandler } from "../controllers/escrow/register-escrow-webhook";
import { authenticate } from "../middleware/auth";
import { enforceAccountStanding } from "../middleware/account-standing";
import { paymentUpdateLimiter } from "../middleware/rate-limiter";

const router = express.Router();

/** Public: Escrow.com POSTs here (no auth header). */
router.post("/webhook", escrowWebhook);

router.use(authenticate);
router.use(enforceAccountStanding);

router.post("/transaction", paymentUpdateLimiter, initEscrowTransaction);
router.post("/transaction/cancel", paymentUpdateLimiter, cancelEscrowTransaction);
router.get("/transaction/:escrowTransactionId", getEscrowTransactionStatus);

router.post("/dev/register-webhook", registerEscrowWebhookHandler);

export default router;
