import mongoose from "mongoose";

import {
  CHAT_INACTIVE_PURGE_DAYS,
  allParticipantsLeft,
} from "../../lib/chat-active";
import Chat from "../../models/conversations";
import Message from "../../models/messages";

type ChatPurgeRow = {
  _id: mongoose.Types.ObjectId;
  participants?: unknown[];
  userLeftChat?: unknown[];
  lastMessageTime?: Date;
  updatedAt?: Date;
};

/**
 * Deletes stale chat threads and their messages:
 * - No activity for {@link CHAT_INACTIVE_PURGE_DAYS} days, or
 * - Every participant has left the chat (`userLeftChat`).
 */
export default async function purgeChats(): Promise<void> {
  const cutoff = new Date(
    Date.now() - CHAT_INACTIVE_PURGE_DAYS * 24 * 60 * 60 * 1000,
  );

  try {
    const candidates = (await Chat.find({})
      .select("participants userLeftChat lastMessageTime updatedAt")
      .lean()) as ChatPurgeRow[];

    const toDelete: mongoose.Types.ObjectId[] = [];

    for (const chat of candidates) {
      const activityAt = chat.lastMessageTime ?? chat.updatedAt;
      const inactive =
        activityAt != null
          ? new Date(activityAt) < cutoff
          : chat.updatedAt != null && new Date(chat.updatedAt) < cutoff;

      if (inactive || allParticipantsLeft(chat.participants ?? [], chat.userLeftChat)) {
        toDelete.push(chat._id);
      }
    }

    if (toDelete.length === 0) {
      // eslint-disable-next-line no-console
      console.log("[cron] purgeChats: nothing to delete");
      return;
    }

    const msgResult = await Message.deleteMany({ chatId: { $in: toDelete } });
    const chatResult = await Chat.deleteMany({ _id: { $in: toDelete } });

    // eslint-disable-next-line no-console
    console.log(
      `[cron] purgeChats: removed ${chatResult.deletedCount} chats, ${msgResult.deletedCount} messages`,
    );
  } catch (err) {
    console.error("[cron] purgeChats failed:", err);
  }
}
