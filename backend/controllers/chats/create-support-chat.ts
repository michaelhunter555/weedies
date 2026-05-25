import type { Request, Response } from "express";
import mongoose from "mongoose";

import { displayImage, participantRoleForListing } from "../../lib/chat-helpers";
import Chat from "../../models/conversations";
import Message from "../../models/messages";
import User from "../../models/user";

const SUPPORT_GREETING =
  "Thanks for contacting support. Leave a message and we will get back to you as soon as we can.";

/**
 * Opens (or reuses) a single open support thread between the user and the first admin account.
 */
export async function createSupportChat(req: Request, res: Response) {
  const userId = req.user?.userId;
  if (!userId) {
    return void res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const admin = (await User.findOne({ role: "admin" })
      .sort({ createdAt: 1 })
      .select("_id name image")
      .lean()) as { _id: unknown; name?: string; image?: string | null } | null;

    if (!admin?._id) {
      return void res.status(503).json({
        message: "Support is not available (no admin user in the database).",
        ok: false,
      });
    }

    const adminId = String(admin._id);

    const existing = (await Chat.findOne({
      participants: { $all: [userId, adminId] },
      chatIsComplete: false,
    })
      .select("_id")
      .lean()) as { _id: unknown } | null;

    if (existing) {
      return void res.status(409).json({
        message: "You already have an open support chat. Continue there or mark it complete first.",
        chatId: String(existing._id),
        ok: false,
      });
    }

    const user = (await User.findById(userId)
      .select("name image mode")
      .lean()) as { name?: string; image?: string | null; mode?: string } | null;
    if (!user) {
      return void res.status(404).json({ message: "User not found.", ok: false });
    }

    const userRole = participantRoleForListing(userId, null, user.mode);

    const chat = await Chat.create({
      participants: [
        new mongoose.Types.ObjectId(adminId),
        new mongoose.Types.ObjectId(userId),
      ],
      participantInfo: [
        {
          id: new mongoose.Types.ObjectId(adminId),
          name: String(admin.name ?? "Support"),
          image: displayImage(admin.image),
          role: "admin",
        },
        {
          id: new mongoose.Types.ObjectId(userId),
          name: String(user.name ?? "User"),
          image: displayImage(user.image),
          role: userRole,
        },
      ],
      lastMessage: SUPPORT_GREETING,
      lastMessageTime: new Date(),
      chatIsComplete: false,
      initiatedBy: new mongoose.Types.ObjectId(adminId),
    });

    await Message.create({
      chatId: chat._id,
      senderId: new mongoose.Types.ObjectId(adminId),
      text: SUPPORT_GREETING,
      read: false,
    });

    return void res.status(201).json({
      chatId: String(chat._id),
      ok: true,
    });
  } catch (err) {
    console.error("createSupportChat:", err);
    return void res.status(500).json({
      message: "Failed to create support chat.",
      ok: false,
    });
  }
}
