"use client";

import { useEffect, useRef } from "react";
import { syncAllPendingContacts, isOnline } from "@/lib/contactService";

const CONTACT_SYNC_INTERVAL_MS = 10_000;

/**
 * Runs contact sync (including field voice transcribe + upload) when online.
 * Mounted in layout so pending contacts auto-sync on any page with a good connection.
 */
export default function ContactSyncInitializer() {
  const syncingRef = useRef(false);

  useEffect(() => {
    const runSync = async () => {
      if (typeof window === "undefined" || !isOnline() || syncingRef.current) return;
      syncingRef.current = true;
      try {
        await syncAllPendingContacts();
      } finally {
        syncingRef.current = false;
      }
    };

    const handleOnline = () => runSync();

    window.addEventListener("online", handleOnline);

    if (isOnline()) {
      setTimeout(runSync, 1500);
    }

    const interval = setInterval(runSync, CONTACT_SYNC_INTERVAL_MS);

    return () => {
      window.removeEventListener("online", handleOnline);
      clearInterval(interval);
    };
  }, []);

  return null;
}
