import mongoose from "mongoose";

import type { ParticipantRole } from "../models/conversations";
import Listing from "../models/listing";
import Message from "../models/messages";
import User from "../models/user";
import { chatTypeOrDefault } from "./chat-type";
import { maskLabelForListingThread } from "./chat-privacy";

type ParticipantLean = { id?: unknown; name: string; image?: string; role: string };

type ChatLean = {
  _id: unknown;
  participants?: unknown[];
  participantInfo?: ParticipantLean[];
  listingId?: unknown;
  initiatedBy?: unknown;
  chatType?: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  chatIsComplete?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export type ListingMetaForChat = { appName: string; slug?: string };

function productPathForListing(listingId: string, slug?: string | null): string {
  const s = slug?.trim();
  if (s) {
    return `/products/${encodeURIComponent(listingId)}/${encodeURIComponent(s)}`;
  }
  return `/products/${encodeURIComponent(listingId)}`;
}

export async function viewerHasSentMessage(
  chatId: mongoose.Types.ObjectId,
  viewerUserId: string,
): Promise<boolean> {
  const n = await Message.countDocuments({
    chatId,
    senderId: new mongoose.Types.ObjectId(viewerUserId),
  });
  return n > 0;
}

/**
 * Adds `viewerCounterpart` / `viewerMe` for inbox UI, masking the thread starter on
 * listing-linked chats until the other participant has sent at least one message.
 */
export async function serializeChatForViewer(
  chat: ChatLean,
  viewerId: string,
  listingMetaById?: Map<string, ListingMetaForChat>,
): Promise<Record<string, unknown>> {
  const participants = chat.participantInfo ?? [];
  const counterpart = participants.find((p) => String(p.id) !== viewerId);
  const viewerParticipant = participants.find((p) => String(p.id) === viewerId);

  const listingId = chat.listingId != null ? String(chat.listingId) : "";
  const initiatedBy =
    chat.initiatedBy != null ? String(chat.initiatedBy) : "";

  let listApp: string | undefined;
  let listSlug: string | undefined;
  if (listingId) {
    const meta = listingMetaById?.get(listingId);
    if (meta?.appName) {
      listApp = meta.appName;
      listSlug = meta.slug?.trim() || undefined;
    } else {
      const row = (await Listing.findById(listingId)
        .select("appName slug")
        .lean()) as { appName?: string; slug?: string } | null;
      listApp = String(row?.appName ?? "Listing");
      listSlug = row?.slug?.trim() || undefined;
    }
  }

  let displayName = counterpart?.name ?? "User";
  let image = counterpart?.image ?? "";
  let counterpartMasked = false;

  if (
    listingId &&
    initiatedBy &&
    counterpart &&
    String(counterpart.id) === initiatedBy &&
    viewerId !== initiatedBy
  ) {
    const replied = await viewerHasSentMessage(
      new mongoose.Types.ObjectId(String(chat._id)),
      viewerId,
    );
    if (!replied) {
      const appName = listApp ?? "Listing";
      const initiatorEntry = participants.find((p) => String(p.id) === initiatedBy);
      displayName = maskLabelForListingThread(
        appName,
        (initiatorEntry?.role as ParticipantRole) ?? "customer",
      );
      image = "";
      counterpartMasked = true;
    }
  }

  const listingSummary =
    listingId && listApp
      ? {
          id: listingId,
          appName: listApp,
          slug: listSlug,
          productPath: productPathForListing(listingId, listSlug),
        }
      : null;

  return {
    _id: String(chat._id),
    participants: (chat.participants ?? []).map((id) => String(id)),
    lastMessage: chat.lastMessage,
    lastMessageTime: chat.lastMessageTime,
    listingId: listingId || undefined,
    listing: listingSummary,
    chatType: chatTypeOrDefault(chat.chatType),
    initiatedBy: initiatedBy || undefined,
    chatIsComplete: chat.chatIsComplete,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
    viewerCounterpart: {
      id: counterpart ? String(counterpart.id) : null,
      displayName,
      image,
      masked: counterpartMasked,
    },
    viewerMe: viewerParticipant
      ? {
          id: String(viewerParticipant.id),
          name: viewerParticipant.name,
          image: viewerParticipant.image ?? "",
        }
      : null,
  };
}

export async function serializeMessagesForViewer(
  chat: ChatLean & { _id: unknown },
  viewerId: string,
  messages: Array<{
    _id: unknown;
    chatId?: unknown;
    senderId: unknown;
    text: string;
    read?: boolean;
    isSystem?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }>,
  listingAppName?: string | null,
): Promise<
  Array<{
    _id: string;
    text: string;
    read: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    fromMe: boolean;
    senderLabel: string;
    senderId: string;
    isSystem: boolean;
  }>
> {
  const listingId = chat.listingId != null ? String(chat.listingId) : "";
  const initiatedBy =
    chat.initiatedBy != null ? String(chat.initiatedBy) : "";

  let maskInitiatorToViewer = false;
  let maskLabel = "";
  if (listingId && initiatedBy && viewerId !== initiatedBy) {
    const replied = await viewerHasSentMessage(
      new mongoose.Types.ObjectId(String(chat._id)),
      viewerId,
    );
    if (!replied) {
      maskInitiatorToViewer = true;
      const participants = chat.participantInfo ?? [];
      const initiatorEntry = participants.find((p) => String(p.id) === initiatedBy);
      const appName =
        listingAppName ??
        String(
          (
            (await Listing.findById(listingId).select("appName").lean()) as {
              appName?: string;
            } | null
          )?.appName ?? "Listing",
        );
      maskLabel = maskLabelForListingThread(
        appName,
        (initiatorEntry?.role as ParticipantRole) ?? "customer",
      );
    }
  }

  const senderIds = [...new Set(messages.map((m) => String(m.senderId)))];
  const senders = (await User.find({ _id: { $in: senderIds } })
    .select("name")
    .lean()) as { _id: unknown; name?: string }[];
  const nameById = new Map(senders.map((u) => [String(u._id), String(u.name ?? "User")]));

  return messages.map((m) => {
    const isSystem = Boolean(m.isSystem);
    const sid = String(m.senderId);
    const fromMe = !isSystem && sid === viewerId;
    const fromInitiator = initiatedBy && sid === initiatedBy;
    const useMask = !isSystem && maskInitiatorToViewer && fromInitiator && !fromMe;
    const senderLabel = isSystem
      ? ""
      : fromMe
        ? "You"
        : useMask
          ? maskLabel
          : nameById.get(sid) ?? "User";

    return {
      _id: String(m._id),
      text: m.text,
      read: Boolean(m.read),
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      fromMe,
      senderLabel,
      senderId: sid,
      isSystem,
    };
  }).reverse();
}

/**
 * Name shown to `recipientId` for a realtime notification when `senderId` posts.
 * Masks the thread starter on listing chats until the recipient has sent a message.
 */
export async function senderLabelForRealtime(
  chat: Pick<ChatLean, "listingId" | "initiatedBy" | "participantInfo"> & { _id: unknown },
  senderId: string,
  recipientId: string,
  senderRealName: string,
): Promise<string> {
  const listingId = chat.listingId != null ? String(chat.listingId) : "";
  const initiatedBy = chat.initiatedBy != null ? String(chat.initiatedBy) : "";
  if (!listingId || !initiatedBy || senderId !== initiatedBy || recipientId === initiatedBy) {
    return senderRealName;
  }

  const replied = await viewerHasSentMessage(
    new mongoose.Types.ObjectId(String(chat._id)),
    recipientId,
  );
  if (replied) {
    return senderRealName;
  }

  const participants = chat.participantInfo ?? [];
  const initiatorEntry = participants.find((p) => String(p.id) === initiatedBy);
  const appName = String(
    (
      (await Listing.findById(listingId).select("appName").lean()) as {
        appName?: string;
      } | null
    )?.appName ?? "Listing",
  );
  return maskLabelForListingThread(
    appName,
    (initiatorEntry?.role as ParticipantRole) ?? "customer",
  );
}
