import express from "express";
import rateLimit from "express-rate-limit";

import { postSupportChat } from "../controllers/support/post-support-chat";

const router = express.Router();

/** Public AI widget — tight limit; conversations are not stored. */
const supportChatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many chat messages — please wait a moment." },
});

router.post("/chat", supportChatLimiter, postSupportChat);

export default router;
