import type { Request, Response } from "express";
import mongoose from "mongoose";

import {
  serializeChatForViewer,
  serializeMessagesForViewer,
  type ListingMetaForChat,
} from "../../lib/chat-view-serialization";
import Chat from "../../models/conversations";
import Listing from "../../models/listing";
import Message from "../../models/messages";

type ChatDocLean = {
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
 * Paginated messages for a chat the user belongs to.
 */
export async function getChatMessages(req: Request, res: Response) {
  const userId = req.user?.userId;
  if (!userId) {
    return void res.status(401).json({ message: "Unauthorized" });
  }

  const chatId = String(req.params.chatId ?? "").trim();
  if (!mongoose.isValidObjectId(chatId)) {
    return void res.status(400).json({ message: "Invalid chat id." });
  }

  const pageNum = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10) || 20));

  try {
    const chatDoc = (await Chat.findById(chatId)
      .select(
        "participants listingId initiatedBy participantInfo lastMessage lastMessageTime chatIsComplete createdAt updatedAt",
      )
      .lean()) as ChatDocLean | null;
    if (!chatDoc) {
      return void res.status(404).json({ ok: false, message: "Chat not found." });
    }

    const participantIds = (chatDoc.participants ?? []).map((p: unknown) => String(p));
    if (!participantIds.includes(userId)) {
      return void res.status(403).json({ ok: false, message: "Forbidden." });
    }

    const chatObjectId = new mongoose.Types.ObjectId(chatId);

    let listingAppName: string | null = null;
    let listingMetaById: Map<string, ListingMetaForChat> | undefined;
    if (chatDoc.listingId != null) {
      const lid = String(chatDoc.listingId);
      const row = (await Listing.findById(lid)
        .select("appName slug")
        .lean()) as { appName?: string; slug?: string } | null;
      const appName = String(row?.appName ?? "Listing");
      listingAppName = appName;
      listingMetaById = new Map([
        [
          lid,
          {
            appName,
            slug: row?.slug ? String(row.slug) : undefined,
          },
        ],
      ]);
    }

    const chatPreview = await serializeChatForViewer(chatDoc, userId, listingMetaById);

    // Mark anything addressed to the viewer as read up-front — opening the
    // chat counts as "seen". Idempotent so it is safe to call on every page.
    await Message.updateMany(
      {
        chatId: chatObjectId,
        senderId: { $ne: new mongoose.Types.ObjectId(userId) },
        read: false,
      },
      { $set: { read: true } },
    );

    const [chatMessages, totalMessages] = await Promise.all([
      Message.find({ chatId: chatObjectId })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .sort({ createdAt: -1 })
        .lean(),
      Message.countDocuments({ chatId: chatObjectId }),
    ]);

    const serialized = await serializeMessagesForViewer(
      chatDoc,
      userId,
      chatMessages as unknown as Array<{
        _id: unknown;
        chatId?: unknown;
        senderId: unknown;
        text: string;
        read?: boolean;
        createdAt?: Date;
        updatedAt?: Date;
      }>,
      listingAppName,
    );

    const totalPages = Math.ceil(totalMessages / limitNum) || 1;

    return void res.status(200).json({
      chatPreview,
      chatMessages: serialized,
      totalMessages,
      totalPages,
      page: pageNum,
      limit: limitNum,
      ok: true,
    });
  } catch (err) {
    console.error("getChatMessages:", err);
    return void res.status(500).json({ message: "Failed to load messages.", ok: false });
  }
}
