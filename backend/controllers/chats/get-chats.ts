import type { Request, Response } from "express";
import mongoose from "mongoose";

import {
  MAX_ACTIVE_CHATS_PER_USER,
  activeChatFilterForUser,
  countActiveChatsForUser,
} from "../../lib/chat-active";
import { serializeChatForViewer } from "../../lib/chat-view-serialization";
import Chat from "../../models/conversations";
import Listing from "../../models/listing";
import Message from "../../models/messages";

type ChatLean = {
  _id: unknown;
  participants?: unknown[];
  participantInfo?: Array<{ id?: unknown; name: string; image?: string; role: string }>;
  listingId?: unknown;
  initiatedBy?: unknown;
  lastMessage?: string;
  lastMessageTime?: Date;
  chatIsComplete?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

/**
 * Paginated chats for the authenticated user (sorted by `updatedAt`).
 */
export async function getChats(req: Request, res: Response) {
  const userId = req.user?.userId;
  if (!userId) {
    return void res.status(401).json({ message: "Unauthorized" });
  }

  const pageNum = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? "10"), 10) || 10));
  const orderNum = req.query.order === "1" ? 1 : -1;

  try {
    const filter = activeChatFilterForUser(userId);

    const [chats, totalChats, activeChatCount] = await Promise.all([
      Chat.find(filter)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .sort({ updatedAt: orderNum })
        .lean(),
      Chat.countDocuments(filter),
      countActiveChatsForUser(userId),
    ]);

    const raw = chats as ChatLean[];
    const listingIds = [...new Set(raw.map((c) => c.listingId).filter(Boolean).map(String))];
    const listingRows =
      listingIds.length > 0
        ? ((await Listing.find({ _id: { $in: listingIds } })
            .select("_id appName slug")
            .lean()) as { _id: unknown; appName?: string; slug?: string }[])
        : [];
    const listingMetaById = new Map(
      listingRows.map((l) => [
        String(l._id),
        {
          appName: String(l.appName ?? "Listing"),
          slug: l.slug ? String(l.slug) : undefined,
        },
      ]),
    );

    const serializedRaw = await Promise.all(
      raw.map((c) => serializeChatForViewer(c, userId, listingMetaById)),
    );

    // Per-chat unread count (messages from someone else, not yet marked read).
    const chatObjectIds = raw
      .map((c) => (c._id != null ? String(c._id) : ""))
      .filter(Boolean)
      .map((id) => new mongoose.Types.ObjectId(id));
    const viewerOid = new mongoose.Types.ObjectId(userId);
    const unreadByChat = new Map<string, number>();
    if (chatObjectIds.length > 0) {
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
      for (const row of grouped) {
        unreadByChat.set(String(row._id ?? ""), row.count);
      }
    }

    const serialized = serializedRaw.map((chat) => {
      const id = String((chat as { _id?: unknown })._id ?? "");
      return { ...chat, unreadCount: unreadByChat.get(id) ?? 0 };
    });

    const totalPages = Math.ceil(totalChats / limitNum) || 1;

    return void res.status(200).json({
      chats: serialized,
      page: pageNum,
      totalChats,
      totalPages,
      limit: limitNum,
      activeChatCount,
      maxActiveChats: MAX_ACTIVE_CHATS_PER_USER,
      ok: true,
    });
  } catch (err) {
    console.error("getChats:", err);
    return void res.status(500).json({ message: "Failed to load chats.", ok: false });
  }
}
