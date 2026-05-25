import { io } from "../app";
import { userChatMessageReceivedNotificationEmail } from "./email-notifications";
import { senderLabelForRealtime } from "./chat-view-serialization";
import { SocketEvents } from "./socket-events";
import type { IParticipantInfo } from "../models/conversations";
import User from "../models/user";

/** Minimum gap between email digests for the same thread. */
export const CHAT_EMAIL_COOLDOWN_MS = 2 * 60 * 60 * 1000;

export function shouldEmailChatRecipient(
  previousLastMessageTime: Date | undefined | null,
  options?: { isNewChat?: boolean },
): boolean {
  if (options?.isNewChat) return true;
  if (!previousLastMessageTime) return true;
  return (
    Date.now() - previousLastMessageTime.getTime() >= CHAT_EMAIL_COOLDOWN_MS
  );
}

export function isUserSocketOnline(userId: string): boolean {
  if (!userId) return false;
  const room = io.sockets.adapter.rooms.get(userId);
  return Boolean(room && room.size > 0);
}

async function resolveParticipantEmail(
  participant: IParticipantInfo | undefined,
  userId: string,
): Promise<string | null> {
  const stored =
    typeof participant?.email === "string" ? participant.email.trim() : "";
  if (stored) return stored;
  if (!userId) return null;
  const row = (await User.findById(userId).select("email").lean()) as {
    email?: string;
  } | null;
  const email = row?.email?.trim();
  return email || null;
}

type ChatNotifyContext = {
  _id: unknown;
  listingId?: unknown;
  initiatedBy?: unknown;
  participantInfo?: IParticipantInfo[];
};

/**
 * Real-time socket + throttled email when the recipient is offline.
 */
export async function notifyChatRecipient(params: {
  chat: ChatNotifyContext;
  senderUserId: string;
  senderRealName: string;
  text: string;
  previousLastMessageTime?: Date | null;
  isNewChat?: boolean;
  listingId?: string | null;
}): Promise<void> {
  const {
    chat,
    senderUserId,
    senderRealName,
    text,
    previousLastMessageTime,
    isNewChat,
    listingId,
  } = params;

  const infos = (chat.participantInfo ?? []) as IParticipantInfo[];
  const receiver = infos.find((p) => String(p.id) !== String(senderUserId));
  const receiverId = receiver?.id != null ? String(receiver.id) : "";
  if (!receiverId) return;

  const senderName = await senderLabelForRealtime(
    {
      _id: chat._id,
      listingId: chat.listingId,
      initiatedBy: chat.initiatedBy,
      participantInfo: infos.map((p) => ({
        id: p.id,
        name: p.name,
        image: p.image,
        role: p.role,
      })),
    },
    senderUserId,
    receiverId,
    senderRealName,
  );

  const preview = text.length > 140 ? `${text.slice(0, 137)}…` : text;

  if (isUserSocketOnline(receiverId)) {
    if (isNewChat) {
      io.to(receiverId).emit(SocketEvents.CHAT_MESSAGE_NEW, {
        message: "New message",
        chatId: String(chat._id),
        listingId: listingId ?? undefined,
        preview,
      });
    } else {
      io.to(receiverId).emit("chat:message", {
        chatId: String(chat._id),
        text,
        senderId: senderUserId,
        senderName,
      });
    }
    return;
  }

  if (
    !shouldEmailChatRecipient(previousLastMessageTime, { isNewChat })
  ) {
    return;
  }

  const receiverEmail = await resolveParticipantEmail(receiver, receiverId);
  if (!receiverEmail || !receiver) return;

  await userChatMessageReceivedNotificationEmail(
    receiverEmail,
    receiver.name,
    senderName,
    text,
  );
}
