import { getPendingRecordings } from "../audio/getPending";
import { markRecordingSynced } from "../audio/markSynced";

export interface SyncResult {
  synced: number;
  failed: number;
}

const MAX_RETRIES = 2;
const RETRY_DELAY = 3000;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let isSyncing = false;

export async function syncRecordings(): Promise<SyncResult> {
  // Prevent concurrent syncs
  if (isSyncing) return { synced: 0, failed: 0 };
  isSyncing = true;

  try {
    const pending = await getPendingRecordings();
    let synced = 0;
    let failed = 0;

    for (const rec of pending) {
      let success = false;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const formData = new FormData();
          formData.append("audio", rec.audio);

          const res = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          });

          if (res.ok) {
            const data = await res.json();
            await markRecordingSynced(rec.id!, data.transcript);
            synced++;
            success = true;
            break;
          }

          // Don't retry 4xx errors
          if (res.status >= 400 && res.status < 500) break;

          if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY * attempt);
        } catch {
          if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY * attempt);
        }
      }

      if (!success) failed++;
    }

    // Notify UI that recordings were updated
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("recordingsUpdated"));
    }

    return { synced, failed };
  } finally {
    isSyncing = false;
  }
}

// Interval for auto-sync when online (same idea as contact sync)
const RECORDING_SYNC_INTERVAL_MS = 15_000;

// Global init — call once from layout, safe to call multiple times
let initialized = false;

export function initOnlineSync() {
  if (typeof window === "undefined" || initialized) return;
  initialized = true;

  const runSync = () => {
    if (navigator.onLine) syncRecordings();
  };

  // Sync when coming back online
  window.addEventListener("online", () => {
    console.log("[sync] Back online — syncing recordings...");
    runSync();
  });

  // First load if already online
  if (navigator.onLine) {
    setTimeout(runSync, 2000);
  }

  // Auto-sync periodically when online (no manual "Sync Now" needed)
  setInterval(runSync, RECORDING_SYNC_INTERVAL_MS);
}
