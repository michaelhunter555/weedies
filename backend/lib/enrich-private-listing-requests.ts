import mongoose from "mongoose";
import User from "../models/user";
import { regionLabelFromUser } from "./user-locale";

type PendingRow = {
  _id?: unknown;
  requesterId?: unknown;
  status?: "pending" | "approved" | "denied";
  message?: string;
  createdAt?: Date;
  resolvedAt?: Date | null;
};

type RequesterLean = {
  _id?: unknown;
  name?: string;
  locale?: string | null;
  timezone?: string | null;
};

/**
 * Seller dashboard: attach requester name + region for pending private access rows.
 */
export async function enrichPendingPrivateListingRequests(
  rows: PendingRow[] | undefined,
) {
  const list = Array.isArray(rows) ? rows : [];
  if (list.length === 0) return list;

  const ids = [
    ...new Set(
      list
        .map((r) => String(r.requesterId ?? ""))
        .filter((id) => mongoose.isValidObjectId(id)),
    ),
  ];
  if (ids.length === 0) return list;

  const users = (await User.find({ _id: { $in: ids } })
    .select("name locale timezone")
    .lean()) as RequesterLean[];

  const byId = new Map(
    users.map((u) => [
      String(u._id),
      {
        id: String(u._id),
        name: String(u.name ?? "User"),
        locale: u.locale ?? null,
        timezone: u.timezone ?? null,
        regionLabel: regionLabelFromUser(u.locale, u.timezone),
      },
    ]),
  );

  return list.map((row) => {
    const requesterId = String(row.requesterId ?? "");
    const requester = byId.get(requesterId);
    return {
      ...row,
      _id: row._id != null ? String(row._id) : undefined,
      requesterId,
      status: row.status ?? "pending",
      message:
        typeof row.message === "string" && row.message.trim()
          ? row.message.trim()
          : undefined,
      requester: requester ?? {
        id: requesterId,
        name: "User",
        locale: null,
        timezone: null,
        regionLabel: "—",
      },
    };
  });
}
