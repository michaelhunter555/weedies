import mongoose from "mongoose";

import { io } from "../app";
import Chat from "../models/conversations";
import Message from "../models/messages";
import User from "../models/user";
import { otherParticipantId } from "./chat-active";
import { SocketEvents } from "./socket-events";

/**
 * Inserts a system line in the thread and notifies the remaining participant.
 */
export async function notifyChatParticipantLeft(
  chatId: mongoose.Types.ObjectId,
  leaverUserId: string,
): Promise<void> {
  const chat = (await Chat.findById(chatId)
    .select("participants")
    .lean()) as { participants?: unknown[] } | null;
  if (!chat) return;

  const leaver = (await User.findById(leaverUserId).select("name").lean()) as {
    name?: string;
  } | null;
  const text = `${String(leaver?.name ?? "User")} left this chat.`;
  const leaverOid = new mongoose.Types.ObjectId(leaverUserId);
  const now = new Date();

  await Message.create({
    chatId,
    senderId: leaverOid,
    text,
    read: false,
    isSystem: true,
  });

  await Chat.updateOne(
    { _id: chatId },
    { $set: { lastMessage: text, lastMessageTime: now } },
  );

  const otherId = otherParticipantId(chat.participants ?? [], leaverUserId);
  if (!otherId) return;

  const payload = {
    chatId: String(chatId),
    message: text,
  };
  io.to(otherId).emit(SocketEvents.CHAT_PARTICIPANT_LEFT, payload);
  io.to(otherId).emit(SocketEvents.CHAT_MESSAGE_NEW, {
    chatId: String(chatId),
    message: text,
  });
}
