import type { Request, Response } from "express";
import mongoose from "mongoose";

import { io } from "../../app";
import { displayImage, participantRoleForListing } from "../../lib/chat-helpers";
import { SocketEvents } from "../../lib/socket-events";
import Chat from "../../models/conversations";
import Listing from "../../models/listing";
import Message from "../../models/messages";
import User from "../../models/user";

type Body = {
  recipientId?: unknown;
  message?: unknown;
  listingId?: unknown;
};

type UserLean = { name?: string; image?: string | null; mode?: string };

/**
 * Start a 1:1 chat between the authenticated user and `recipientId`.
 * Optional `listingId` sets seller vs customer roles from the listing owner.
 */
export async function createChat(req: Request, res: Response) {
  const senderId = req.user?.userId;
  if (!senderId) {
    return void res.status(401).json({ message: "Unauthorized" });
  }

  const { recipientId, message, listingId } = (req.body || {}) as Body;
  const text = typeof message === "string" ? message.trim() : "";
  const rid = typeof recipientId === "string" ? recipientId.trim() : "";

  if (!rid || !text) {
    return void res.status(400).json({
      message: "recipientId and message (non-empty text) are required.",
    });
  }

  if (rid === senderId) {
    return void res.status(400).json({ message: "Cannot start a chat with yourself." });
  }

  let lid: string | null = null;
  let listingSellerId: string | null = null;
  if (listingId != null && String(listingId).length > 0) {
    lid = String(listingId).trim();
    if (!mongoose.isValidObjectId(lid)) {
      return void res.status(400).json({ message: "Invalid listingId." });
    }
    const listing = (await Listing.findById(lid)
      .select("sellerId")
      .lean()) as { sellerId?: unknown } | null;
    if (!listing?.sellerId) {
      return void res.status(404).json({ message: "Listing not found." });
    }
    listingSellerId = String(listing.sellerId);
  }

  try {
    const [sender, recipient] = (await Promise.all([
      User.findById(senderId).select("name image mode").lean(),
      User.findById(rid).select("name image mode").lean(),
    ])) as [UserLean | null, UserLean | null];

    if (!sender || !recipient) {
      return void res.status(404).json({ message: "User not found." });
    }

    const senderRole = participantRoleForListing(
      senderId,
      listingSellerId,
      sender.mode,
    );
    const recipientRole = participantRoleForListing(
      rid,
      listingSellerId,
      recipient.mode,
    );

    const chat = await Chat.create({
      participants: [
        new mongoose.Types.ObjectId(senderId),
        new mongoose.Types.ObjectId(rid),
      ],
      participantInfo: [
        {
          id: new mongoose.Types.ObjectId(senderId),
          name: String(sender.name ?? "User"),
          image: displayImage(sender.image),
          role: senderRole,
        },
        {
          id: new mongoose.Types.ObjectId(rid),
          name: String(recipient.name ?? "User"),
          image: displayImage(recipient.image),
          role: recipientRole,
        },
      ],
      lastMessage: text,
      lastMessageTime: new Date(),
      chatIsComplete: false,
      listingId: lid ? new mongoose.Types.ObjectId(lid) : undefined,
      initiatedBy: new mongoose.Types.ObjectId(senderId),
    });

    await Message.create({
      chatId: chat._id,
      senderId: new mongoose.Types.ObjectId(senderId),
      text,
      read: false,
    });

    io.to(rid).emit(SocketEvents.CHAT_MESSAGE_NEW, {
      message: "New message",
      chatId: String(chat._id),
      listingId: lid ?? undefined,
      preview: text.length > 140 ? `${text.slice(0, 137)}…` : text,
    });

    return void res.status(201).json({ chat });
  } catch (err) {
    console.error("createChat:", err);
    return void res.status(500).json({ message: "Failed to create chat." });
  }
}
