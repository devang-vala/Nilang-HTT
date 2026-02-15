"use client";

import { useEffect } from "react";
import { initOnlineSync } from "@/lib/sync/syncRecording";

/**
 * Global component that initializes the online sync listener.
 * Mount once in the root layout so recordings sync automatically
 * whenever the device comes back online — regardless of which page
 * the user is on.
 */
export default function RecordingSyncInitializer() {
  useEffect(() => {
    initOnlineSync();
  }, []);

  return null;
}
