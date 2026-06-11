import express from "express";

import { closeChat } from "../controllers/chats/close-chat";
import { getChatMessages } from "../controllers/chats/get-chat-messages";
import { getChats } from "../controllers/chats/get-chats";
import { getUnreadCount } from "../controllers/chats/get-unread-count";
import { sendChatMessage } from "../controllers/chats/send-chat-message";

const router = express.Router();

router.get("/mine", getChats);
router.get("/unread-count", getUnreadCount);
router.delete("/:chatId", closeChat);
router.get("/:chatId/messages", getChatMessages);
router.post("/:chatId/messages", sendChatMessage);

export default router;
