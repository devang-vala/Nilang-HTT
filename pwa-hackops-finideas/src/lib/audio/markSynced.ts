import { getDB } from "@/lib/db";

export async function markRecordingSynced(
  id: number,
  transcript: string
) {
  const db = await getDB();
  const item = await db.get("recordings", id);
  if (!item) return;

  item.synced = true;
  item.transcript = transcript;
  await db.put("recordings", item);
}
