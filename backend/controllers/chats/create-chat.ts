import type { Request, Response } from "express";
import mongoose from "mongoose";

import {
  MAX_ACTIVE_CHATS_PER_USER,
  countActiveChatsForUser,
  userObjectId,
} from "../../lib/chat-active";
import { displayImage, participantRoleForListing } from "../../lib/chat-helpers";
import { notifyChatRecipient } from "../../lib/chat-notifications";
import Chat from "../../models/conversations";
import Listing from "../../models/listing";
import Message from "../../models/messages";
import User from "../../models/user";
import {
  chatTypeOrDefault,
  resolveChatTypeForCreate,
  type ChatType,
} from "../../lib/chat-type";
import { hasProhibitedGeneralChatList } from "../../utils/prohibited-general-chat-list";

type Body = {
  recipientId?: unknown;
  message?: unknown;
  listingId?: unknown;
  chatType?: unknown;
};

type UserLean = {
  name?: string;
  image?: string | null;
  mode?: string;
  email?: string;
};

function listingFilter(lid: string | null) {
  if (lid) {
    return { listingId: new mongoose.Types.ObjectId(lid) };
  }
  return {
    $or: [{ listingId: { $exists: false } }, { listingId: null }],
  };
}

/**
 * Start a 1:1 chat between the authenticated user and `recipientId`.
 * Optional `listingId` sets seller vs customer roles from the listing owner.
 */
export async function createChat(req: Request, res: Response) {
  const senderId = req.user?.userId;
  if (!senderId) {
    return void res.status(401).json({ message: "Unauthorized" });
  }

  const { recipientId, message, listingId, chatType: chatTypeBody } = (req.body ||
    {}) as Body;
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
      User.findById(senderId).select("name image mode email").lean(),
      User.findById(rid).select("name image mode email").lean(),
    ])) as [UserLean | null, UserLean | null];

    if (!sender || !recipient) {
      return void res.status(404).json({ message: "User not found." });
    }

    const senderOid = userObjectId(senderId);
    const recipientOid = userObjectId(rid);

    const resolvedChatType = await resolveChatTypeForCreate({
      requested: chatTypeBody,
      listingId: lid,
      senderId,
      recipientId: rid,
    });

    const existing = await Chat.findOne({
      participants: { $all: [senderOid, recipientOid] },
      ...listingFilter(lid),
    });

    if (existing) {
      let effectiveChatType: ChatType = chatTypeOrDefault(existing.chatType);
      if (effectiveChatType === "general" && resolvedChatType === "postSale") {
        existing.chatType = "postSale";
        effectiveChatType = "postSale";
      }

      if (hasProhibitedGeneralChatList(text, effectiveChatType)) {
        return void res.status(400).json({
          message:
            "Messages cannot include contact details or off-platform payment requests before a sale is complete. Complete checkout and use the exchange room to coordinate handover.",
        });
      }

      const previousLastMessageTime = existing.lastMessageTime
        ? new Date(existing.lastMessageTime)
        : null;

      const senderLeft = (existing.userLeftChat ?? []).some(
        (id: mongoose.Types.ObjectId) => String(id) === senderId,
      );
      if (senderLeft) {
        existing.userLeftChat = (existing.userLeftChat ?? []).filter(
          (id: mongoose.Types.ObjectId) => String(id) !== senderId,
        );
      }

      existing.lastMessage = text;
      existing.lastMessageTime = new Date();
      await existing.save();

      await Message.create({
        chatId: existing._id,
        senderId: senderOid,
        text,
        read: false,
      });

      await notifyChatRecipient({
        chat: existing,
        senderUserId: senderId,
        senderRealName: String(sender.name ?? "User"),
        text,
        previousLastMessageTime,
        isNewChat: false,
        listingId: lid,
      });

      const activeChatCount = await countActiveChatsForUser(senderId);
      return void res.status(200).json({
        chat: existing,
        reopened: true,
        activeChatCount,
        maxActiveChats: MAX_ACTIVE_CHATS_PER_USER,
      });
    }

    const activeChatCount = await countActiveChatsForUser(senderId);
    if (activeChatCount >= MAX_ACTIVE_CHATS_PER_USER) {
      return void res.status(403).json({
        message: `You can have at most ${MAX_ACTIVE_CHATS_PER_USER} active conversations. Remove one from your inbox to start a new chat.`,
        activeChatCount,
        maxActiveChats: MAX_ACTIVE_CHATS_PER_USER,
      });
    }

    if (hasProhibitedGeneralChatList(text, resolvedChatType)) {
      return void res.status(400).json({
        message:
          "Messages cannot include contact details or off-platform payment requests before a sale is complete. Complete checkout and use the exchange room to coordinate handover.",
      });
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
      chatType: resolvedChatType,
      participants: [senderOid, recipientOid],
      participantInfo: [
        {
          id: senderOid,
          name: String(sender.name ?? "User"),
          image: displayImage(sender.image),
          role: senderRole,
          email: String(sender.email ?? "").trim(),
        },
        {
          id: recipientOid,
          name: String(recipient.name ?? "User"),
          image: displayImage(recipient.image),
          role: recipientRole,
          email: String(recipient.email ?? "").trim(),
        },
      ],
      lastMessage: text,
      lastMessageTime: new Date(),
      chatIsComplete: false,
      userLeftChat: [],
      listingId: lid ? new mongoose.Types.ObjectId(lid) : undefined,
      initiatedBy: senderOid,
    });

    await Message.create({
      chatId: chat._id,
      senderId: senderOid,
      text,
      read: false,
    });

    await notifyChatRecipient({
      chat,
      senderUserId: senderId,
      senderRealName: String(sender.name ?? "User"),
      text,
      isNewChat: true,
      listingId: lid,
    });

    return void res.status(201).json({
      chat,
      activeChatCount: activeChatCount + 1,
      maxActiveChats: MAX_ACTIVE_CHATS_PER_USER,
    });
  } catch (err) {
    console.error("createChat:", err);
    return void res.status(500).json({ message: "Failed to create chat." });
  }
}
