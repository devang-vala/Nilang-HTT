import { getDB } from "@/lib/db";

export interface RecordingRecord {
  id?: number;
  audio: Blob;
  transcript: string | null;
  synced: boolean;
  createdAt: number;
}

export async function saveRecording(blob: Blob): Promise<number> {
  const db = await getDB();

  const id = await db.add("recordings", {
    audio: blob,
    transcript: null,
    createdAt: Date.now(),
    synced: false,
  } as RecordingRecord);

  return id as number;
}
