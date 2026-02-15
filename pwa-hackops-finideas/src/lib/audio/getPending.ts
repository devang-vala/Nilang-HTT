import { getDB } from "@/lib/db";
import { RecordingRecord } from "./saveRecording";

export async function getPendingRecordings(): Promise<RecordingRecord[]> {
  const db = await getDB();
  const all: RecordingRecord[] = await db.getAll("recordings");
  return all.filter((r) => !r.synced);
}

export async function getAllRecordings(): Promise<RecordingRecord[]> {
  const db = await getDB();
  const all: RecordingRecord[] = await db.getAll("recordings");
  return all.sort((a, b) => b.createdAt - a.createdAt);
}
