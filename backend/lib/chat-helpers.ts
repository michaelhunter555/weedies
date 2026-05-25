import type { ParticipantRole } from "../models/conversations";

const DEFAULT_AVATAR =
  "https://res.cloudinary.com/dgt7dwzkz/image/upload/v1/placeholder-avatar.png";

export function displayImage(url: string | null | undefined): string {
  const s = typeof url === "string" ? url.trim() : "";
  return s.length > 0 ? s : DEFAULT_AVATAR;
}

export function participantRoleForListing(
  userId: string,
  listingSellerId: string | null,
  userMode: string | undefined,
): ParticipantRole {
  if (listingSellerId) {
    return userId === listingSellerId ? "seller" : "customer";
  }
  if (userMode === "seller") return "seller";
  if (userMode === "customer") return "customer";
  return "user";
}
