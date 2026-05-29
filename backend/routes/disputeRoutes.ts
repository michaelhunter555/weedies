import express from "express";
import multer from "multer";

import { createDispute } from "../controllers/disputes/create-dispute";
import { getDisputeById } from "../controllers/disputes/get-dispute-by-id";
import { getDisputes } from "../controllers/disputes/get-disputes";
import { respondToDispute } from "../controllers/disputes/respond-to-dispute";
import { authenticate } from "../middleware/auth";
import { enforceAccountStanding } from "../middleware/account-standing";

const router = express.Router();

const disputeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

router.use(authenticate);
router.use(enforceAccountStanding);

router.get("/", getDisputes);
router.get("/:disputeId", getDisputeById);
router.post(
  "/",
  disputeUpload.fields([
    { name: "imageOne", maxCount: 1 },
    { name: "imageTwo", maxCount: 1 },
  ]),
  createDispute,
);
router.post("/:disputeId/respond", respondToDispute);

export default router;
