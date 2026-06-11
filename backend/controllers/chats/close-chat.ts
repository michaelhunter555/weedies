import type { Request, Response } from "express";
import mongoose from "mongoose";

import {
  MAX_ACTIVE_CHATS_PER_USER,
  countActiveChatsForUser,
  userHasLeftChat,
  userObjectId,
} from "../../lib/chat-active";
import { resolveChatActorUserId } from "../../lib/chat-actor";
import { notifyChatParticipantLeft } from "../../lib/chat-participant-left";
import Chat from "../../models/conversations";

/**
 * User leaves the chat for themselves only (`userLeftChat`).
 * The other participant keeps the thread and sees a system message.
 */
export async function closeChat(req: Request, res: Response) {
  const userId = resolveChatActorUserId(req);
  if (!userId) {
    return void res.status(401).json({ message: "Unauthorized", ok: false });
  }

  const chatId = String(req.params.chatId ?? "").trim();
  if (!mongoose.isValidObjectId(chatId)) {
    return void res.status(400).json({ message: "Invalid chat id.", ok: false });
  }

  try {
    const viewerOid = userObjectId(userId);
    const chatOid = new mongoose.Types.ObjectId(chatId);

    const updated = await Chat.findOneAndUpdate(
      {
        _id: chatOid,
        participants: viewerOid,
        userLeftChat: { $nin: [viewerOid] },
      },
      { $addToSet: { userLeftChat: viewerOid } },
      { new: true, select: "_id" },
    );

    if (!updated) {
      const chat = await Chat.findById(chatOid).select("participants userLeftChat");
      if (!chat) {
        return void res.status(404).json({ message: "Chat not found.", ok: false });
      }
      const participantIds = (chat.participants ?? []).map((p: mongoose.Types.ObjectId) =>
        String(p),
      );
      if (!participantIds.includes(userId)) {
        return void res.status(403).json({ message: "Forbidden.", ok: false });
      }
      if (userHasLeftChat(chat.userLeftChat, userId)) {
        const activeChatCount = await countActiveChatsForUser(userId);
        return void res.status(200).json({
          ok: true,
          chatId,
          activeChatCount,
          maxActiveChats: MAX_ACTIVE_CHATS_PER_USER,
        });
      }
      return void res.status(403).json({ message: "Forbidden.", ok: false });
    }

    await notifyChatParticipantLeft(chatOid, userId);

    const activeChatCount = await countActiveChatsForUser(userId);

    return void res.status(200).json({
      ok: true,
      chatId,
      activeChatCount,
      maxActiveChats: MAX_ACTIVE_CHATS_PER_USER,
    });
  } catch (err) {
    console.error("closeChat:", err);
    return void res
      .status(500)
      .json({ message: "Failed to remove chat.", ok: false });
  }
}
