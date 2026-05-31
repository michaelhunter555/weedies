/** Normalize Mongo ObjectId values from API JSON (string or populated object). */
export function mongoIdString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object" && value !== null && "_id" in value) {
    return mongoIdString((value as { _id: unknown })._id);
  }
  return String(value).trim();
}
