import mongoose from "mongoose";
import ListingExchange from "../models/exchange";

export type ChatType = "general" | "postSale";

export function parseChatType(value: unknown): ChatType | null {
  if (value === "general" || value === "postSale") return value;
  return null;
}

export function chatTypeOrDefault(value: unknown): ChatType {
  return parseChatType(value) ?? "general";
}

/**
 * Post-sale threads are only allowed when buyer and seller have an exchange record
 * for the listing (opened from the exchange room).
 */
export async function canUsePostSaleChat(
  listingId: string,
  userA: string,
  userB: string,
): Promise<boolean> {
  if (!mongoose.isValidObjectId(listingId)) return false;

  const ex = (await ListingExchange.findOne({
    listingId: new mongoose.Types.ObjectId(listingId),
  })
    .select("buyerId sellerId")
    .lean()) as { buyerId?: unknown; sellerId?: unknown } | null;

  if (!ex?.buyerId || !ex?.sellerId) return false;

  const allowed = new Set([String(ex.buyerId), String(ex.sellerId)]);
  return allowed.has(userA) && allowed.has(userB);
}

export async function resolveChatTypeForCreate(params: {
  requested: unknown;
  listingId: string | null;
  senderId: string;
  recipientId: string;
}): Promise<ChatType> {
  const requested = parseChatType(params.requested);
  if (requested !== "postSale") return "general";

  if (!params.listingId) return "general";

  const eligible = await canUsePostSaleChat(
    params.listingId,
    params.senderId,
    params.recipientId,
  );
  return eligible ? "postSale" : "general";
}
