import type { Request, Response } from "express";
import mongoose from "mongoose";

import { otherParticipantId, userHasLeftChat } from "../../lib/chat-active";
import { resolveChatActorUserId } from "../../lib/chat-actor";
import { notifyChatRecipient } from "../../lib/chat-notifications";
import { chatTypeOrDefault } from "../../lib/chat-type";
import Chat from "../../models/conversations";
import { hasProhibitedGeneralChatList } from "../../utils/prohibited-general-chat-list";
import Message from "../../models/messages";
import User from "../../models/user";

type Body = {
  text?: unknown;
};

/**
 * Append a message to a chat and bump `lastMessage` / `lastMessageTime`.
 * Notifies the other participant via Socket.IO when online, otherwise email
 * if the prior message in the thread was more than 2 hours ago.
 */
export async function sendChatMessage(req: Request, res: Response) {
  const userId = resolveChatActorUserId(req);
  if (!userId) {
    return void res.status(401).json({ message: "Unauthorized" });
  }

  const chatId = String(req.params.chatId ?? "").trim();
  if (!mongoose.isValidObjectId(chatId)) {
    return void res.status(400).json({ message: "Invalid chat id." });
  }

  const body = (req.body ?? {}) as Body;
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return void res.status(400).json({ message: "text is required." });
  }

  try {
    const sender = (await User.findById(userId).select("name").lean()) as {
      name?: string;
    } | null;
    if (!sender) {
      return void res.status(404).json({ message: "Sender not found." });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return void res.status(404).json({ message: "Chat not found." });
    }

    const previousLastMessageTime = chat.lastMessageTime
      ? new Date(chat.lastMessageTime)
      : null;

    const participantIds = (chat.participants ?? []).map((p: mongoose.Types.ObjectId) =>
      String(p),
    );
    if (!participantIds.includes(userId)) {
      return void res.status(403).json({ message: "Forbidden." });
    }

    if (userHasLeftChat(chat.userLeftChat, userId)) {
      return void res.status(404).json({
        message: "This chat was removed from your inbox. Start a new conversation to message again.",
      });
    }

    const recipientId = otherParticipantId(chat.participants ?? [], userId);
    if (recipientId && userHasLeftChat(chat.userLeftChat, recipientId)) {
      return void res.status(409).json({
        ok: false,
        code: "RECIPIENT_LEFT_CHAT",
        message:
          "The other person left this chat. They will not see new messages until they open the conversation again.",
      });
    }

    const effectiveChatType = chatTypeOrDefault(chat.chatType);
    if (hasProhibitedGeneralChatList(text, effectiveChatType)) {
      return void res.status(400).json({
        ok: false,
        message:
          "Messages cannot include contact details or off-platform payment requests before a sale is complete. Complete checkout and use the exchange room to coordinate handover.",
      });
    }

    chat.lastMessage = text;
    chat.lastMessageTime = new Date();
    await chat.save();

    const message = await Message.create({
      chatId: chat._id,
      senderId: new mongoose.Types.ObjectId(userId),
      text,
      read: false,
    });

    await notifyChatRecipient({
      chat,
      senderUserId: userId,
      senderRealName: String(sender.name ?? "User"),
      text,
      previousLastMessageTime,
      isNewChat: false,
      listingId:
        chat.listingId != null ? String(chat.listingId) : null,
    });

    return void res.status(201).json({ message, ok: true });
  } catch (err) {
    console.error("sendChatMessage:", err);
    return void res.status(500).json({ message: "Failed to send message.", ok: false });
  }
}
