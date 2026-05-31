import mongoose from "mongoose";

/**
 * Drops invalid compound indexes on `chats` that include two array fields
 * (`participants` + `closedBy` / `userLeftChat`). MongoDB error 171 breaks updates.
 * Migrates legacy `closedBy` → `userLeftChat`.
 */
export async function ensureChatIndexes(): Promise<void> {
  const coll = mongoose.connection.collection("chats");
  if (!coll) return;

  try {
    const indexes = await coll.indexes();
    for (const idx of indexes) {
      const name = String(idx.name ?? "");
      const keys = (idx.key ?? {}) as Record<string, number>;
      const hasParticipants = keys.participants != null;
      const hasClosedBy = keys.closedBy != null;
      const hasUserLeft = keys.userLeftChat != null;
      if (hasParticipants && (hasClosedBy || hasUserLeft)) {
        await coll.dropIndex(name);
        // eslint-disable-next-line no-console
        console.log(`[chats] dropped invalid index: ${name}`);
      }
    }
  } catch (err) {
    console.error("[chats] ensureChatIndexes drop:", err);
  }

  try {
    const withLegacy = await coll.countDocuments({
      closedBy: { $exists: true },
    });
    if (withLegacy > 0) {
      await coll.updateMany({ closedBy: { $exists: true } }, [
        {
          $set: {
            userLeftChat: {
              $setUnion: [
                { $ifNull: ["$userLeftChat", []] },
                { $ifNull: ["$closedBy", []] },
              ],
            },
          },
        },
        { $unset: "closedBy" },
      ]);
      // eslint-disable-next-line no-console
      console.log(`[chats] migrated closedBy → userLeftChat (${withLegacy} docs)`);
    }
  } catch (err) {
    console.error("[chats] ensureChatIndexes migrate:", err);
  }
}
