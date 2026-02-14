export interface Lead {
  id: string;
  image: Blob;
  rawText: string;
  ocrStatus: "pending" | "done";
  syncStatus: "pending" | "synced";
  createdAt: number;
}