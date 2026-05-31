import express from "express";

import { authenticate } from "../middleware/auth";
import { enforceAccountStanding } from "../middleware/account-standing";
import { closeChat } from "../controllers/chats/close-chat";
import { createChat } from "../controllers/chats/create-chat";
import { createSupportChat } from "../controllers/chats/create-support-chat";
import { getChatMessages } from "../controllers/chats/get-chat-messages";
import { getChats } from "../controllers/chats/get-chats";
import { getUnreadCount } from "../controllers/chats/get-unread-count";
import { markSupportComplete } from "../controllers/chats/mark-support-complete";
import { sendChatMessage } from "../controllers/chats/send-chat-message";

const router = express.Router();

router.use(authenticate);
router.use(enforceAccountStanding);

router.get("/mine", getChats);
router.get("/unread-count", getUnreadCount);
router.post("/", createChat);
router.post("/support", createSupportChat);
router.patch("/:chatId/support-complete", markSupportComplete);
router.delete("/:chatId", closeChat);
router.get("/:chatId/messages", getChatMessages);
router.post("/:chatId/messages", sendChatMessage);

export default router;
