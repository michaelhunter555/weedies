import mongoose from "mongoose";

import Chat from "../models/conversations";

/** Max inbox threads per user (chats they have not left count toward the limit). */
export const MAX_ACTIVE_CHATS_PER_USER = 10;

/** Purge chats with no activity for this many days (cron). */
export const CHAT_INACTIVE_PURGE_DAYS = 30;

export function userObjectId(userId: string): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId(userId);
}

/** Chats visible in a user's inbox: they are a participant and have not left. */
export function activeChatFilterForUser(userId: string) {
  const oid = userObjectId(userId);
  return {
    participants: oid,
    userLeftChat: { $nin: [oid] },
  };
}

export async function countActiveChatsForUser(userId: string): Promise<number> {
  return Chat.countDocuments(activeChatFilterForUser(userId));
}

/** True when every participant has left the thread. */
export function userHasLeftChat(
  userLeftChat: unknown[] | undefined,
  userId: string,
): boolean {
  return (userLeftChat ?? []).some((id) => String(id) === userId);
}

export function otherParticipantId(
  participants: unknown[],
  viewerUserId: string,
): string | null {
  const id = (participants ?? [])
    .map((p) => String(p))
    .find((p) => p !== viewerUserId);
  return id ?? null;
}

export function allParticipantsLeft(
  participants: unknown[],
  userLeftChat: unknown[] | undefined,
): boolean {
  const participantIds = (participants ?? []).map((p) => String(p));
  if (participantIds.length === 0) return false;
  const leftSet = new Set((userLeftChat ?? []).map((id) => String(id)));
  return participantIds.every((id) => leftSet.has(id));
}
