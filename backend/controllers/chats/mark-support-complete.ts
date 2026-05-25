import type { Request, Response } from "express";
import mongoose from "mongoose";

import Chat from "../../models/conversations";

type Body = {
  chatIsComplete?: unknown;
};

/**
 * Sets `chatIsComplete` on a chat (must be a participant).
 */
export async function markSupportComplete(req: Request, res: Response) {
  const userId = req.user?.userId;
  if (!userId) {
    return void res.status(401).json({ message: "Unauthorized" });
  }

  const chatId = String(req.params.chatId ?? "").trim();
  if (!mongoose.isValidObjectId(chatId)) {
    return void res.status(400).json({ message: "Invalid chat id." });
  }

  const { chatIsComplete } = (req.body || {}) as Body;
  if (typeof chatIsComplete !== "boolean") {
    return void res.status(400).json({
      message: "Body must include chatIsComplete as a boolean.",
    });
  }

  try {
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

    chat.chatIsComplete = chatIsComplete;
    await chat.save();

    return void res.status(200).json({ chatIsComplete, ok: true });
  } catch (err) {
    console.error("markSupportComplete:", err);
    return void res.status(500).json({ message: "Failed to update chat.", ok: false });
  }
}
