import type { Request, Response } from "express";
import mongoose from "mongoose";

import { activeChatFilterForUser } from "../../lib/chat-active";
import Chat from "../../models/conversations";
import Message from "../../models/messages";

type ChatIdRow = { _id: unknown };

/**
 * Returns the unread message count for the authenticated viewer, plus a
 * per-chat breakdown so the inbox list can show dot badges. "Unread" means
 * `read === false` AND the sender is not the viewer.
 */
export async function getUnreadCount(req: Request, res: Response) {
  const userId = req.user?.userId;
  if (!userId) {
    return void res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const myChats = (await Chat.find(activeChatFilterForUser(userId))
      .select("_id")
      .lean()) as ChatIdRow[];
    const chatIds = myChats.map((c) => String(c._id));
    if (chatIds.length === 0) {
      return void res
        .status(200)
        .json({ ok: true, unreadCount: 0, unreadByChat: {} });
    }

    const chatObjectIds = chatIds.map((id) => new mongoose.Types.ObjectId(id));
    const viewerOid = new mongoose.Types.ObjectId(userId);

    const grouped = (await Message.aggregate([
      {
        $match: {
          chatId: { $in: chatObjectIds },
          read: false,
          senderId: { $ne: viewerOid },
        },
      },
      { $group: { _id: "$chatId", count: { $sum: 1 } } },
    ])) as Array<{ _id: unknown; count: number }>;

    const unreadByChat: Record<string, number> = {};
    let unreadCount = 0;
    for (const row of grouped) {
      const id = String(row._id ?? "");
      if (!id) continue;
      unreadByChat[id] = row.count;
      unreadCount += row.count;
    }

    return void res
      .status(200)
      .json({ ok: true, unreadCount, unreadByChat });
  } catch (err) {
    console.error("getUnreadCount:", err);
    return void res
      .status(500)
      .json({ ok: false, message: "Failed to load unread count." });
  }
}
