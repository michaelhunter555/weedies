import mongoose from "mongoose";

type RequestRow = {
  _id?: unknown;
  requesterId?: unknown;
  status?: "pending" | "approved" | "denied";
  message?: string;
  createdAt?: Date;
  resolvedAt?: Date | null;
};

/** Read `requesterId` from a subdocument or plain row (never spread subdocs to persist). */
export function requesterObjectIdFromRow(row: RequestRow): mongoose.Types.ObjectId {
  const raw = row.requesterId;
  if (raw instanceof mongoose.Types.ObjectId) return raw;
  if (raw && typeof raw === "object" && "_id" in raw) {
    const id = String((raw as { _id: unknown })._id ?? "");
    if (mongoose.isValidObjectId(id)) {
      return new mongoose.Types.ObjectId(id);
    }
  }
  const id = String(raw ?? "");
  if (!mongoose.isValidObjectId(id)) {
    throw new Error("Invalid requesterId on private access request");
  }
  return new mongoose.Types.ObjectId(id);
}

export function requesterIdStringFromRow(row: RequestRow): string {
  return String(requesterObjectIdFromRow(row));
}

function plainRequestRow(row: RequestRow): RequestRow {
  if (row && typeof (row as { toObject?: () => RequestRow }).toObject === "function") {
    return (row as { toObject: () => RequestRow }).toObject();
  }
  return row;
}

/**
 * Rebuild subdoc array as plain objects with explicit ObjectIds (fixes spread/save bugs).
 */
export function persistedPrivateRequestRows(
  rows: RequestRow[] | undefined,
): {
  _id?: mongoose.Types.ObjectId;
  requesterId: mongoose.Types.ObjectId;
  status: "pending" | "approved" | "denied";
  message?: string;
  createdAt: Date;
  resolvedAt?: Date | null;
}[] {
  if (!rows?.length) return [];
  return rows.map((raw) => {
    const row = plainRequestRow(raw);
    const status = row.status ?? "pending";
    if (status !== "pending" && status !== "approved" && status !== "denied") {
      throw new Error("Invalid private access request status");
    }
    return {
      ...(row._id != null
        ? { _id: new mongoose.Types.ObjectId(String(row._id)) }
        : {}),
      requesterId: requesterObjectIdFromRow(row),
      status,
      createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
      ...(row.resolvedAt != null ? { resolvedAt: new Date(row.resolvedAt) } : {}),
      ...(typeof row.message === "string" && row.message.trim()
        ? { message: row.message.trim() }
        : {}),
    };
  });
}
