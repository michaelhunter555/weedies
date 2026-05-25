import type { Request, Response } from "express";
import mongoose from "mongoose";

import { io } from "../../app";
import { senderLabelForRealtime } from "../../lib/chat-view-serialization";
import Chat from "../../models/conversations";
import type { IParticipantInfo } from "../../models/conversations";
import Message from "../../models/messages";
import User from "../../models/user";

type Body = {
  text?: unknown;
};

/**
 * Append a message to a chat and bump `lastMessage` / `lastMessageTime`.
 * Emits `chat:message` to the other participant when they are connected via Socket.IO.
 */
export async function sendChatMessage(req: Request, res: Response) {
  const userId = req.user?.userId;
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

    const participantIds = (chat.participants ?? []).map((p: mongoose.Types.ObjectId) =>
      String(p),
    );
    if (!participantIds.includes(userId)) {
      return void res.status(403).json({ message: "Forbidden." });
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

    const infos = (chat.participantInfo ?? []) as IParticipantInfo[];
    const receiver = infos.find((p) => String(p.id) !== String(userId));
    const receiverId = receiver?.id != null ? String(receiver.id) : "";
    const senderRealName = String(sender.name ?? "User");
    const senderName = await senderLabelForRealtime(
      {
        _id: chat._id,
        listingId: chat.listingId,
        initiatedBy: chat.initiatedBy,
        participantInfo: infos as { id?: unknown; name: string; image?: string; role: string }[],
      },
      userId,
      receiverId,
      senderRealName,
    );
    const room = receiverId ? io.sockets.adapter.rooms.get(receiverId) : undefined;
    if (receiverId && room && room.size > 0) {
      io.to(receiverId).emit("chat:message", {
        chatId: String(chat._id),
        text,
        senderId: userId,
        senderName,
      });
    }

    return void res.status(201).json({ message, ok: true });
  } catch (err) {
    console.error("sendChatMessage:", err);
    return void res.status(500).json({ message: "Failed to send message.", ok: false });
  }
}
