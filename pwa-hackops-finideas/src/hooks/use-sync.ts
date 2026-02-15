"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  syncAllPendingContacts,
  getPendingContacts,
  isOnline,
} from "@/lib/contactService";

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: number | null;
  lastSyncResult: { synced: number; failed: number } | null;
}

export function useSync() {
  const [state, setState] = useState<SyncState>({
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncAt: null,
    lastSyncResult: null,
  });

  const syncingRef = useRef(false);

  const updatePendingCount = useCallback(async () => {
    try {
      const pending = await getPendingContacts();
      setState((prev) => ({ ...prev, pendingCount: pending.length }));
    } catch {
      // DB not ready yet
    }
  }, []);

  const triggerSync = useCallback(async () => {
    if (syncingRef.current || !isOnline()) return;

    syncingRef.current = true;
    setState((prev) => ({ ...prev, isSyncing: true }));

    try {
      const result = await syncAllPendingContacts();
      setState((prev) => ({
        ...prev,
        isSyncing: false,
        lastSyncAt: Date.now(),
        lastSyncResult: result,
      }));
    } catch {
      setState((prev) => ({ ...prev, isSyncing: false }));
    } finally {
      syncingRef.current = false;
      await updatePendingCount();
    }
  }, [updatePendingCount]);

  useEffect(() => {
    // Initial state
    setState((prev) => ({ ...prev, isOnline: isOnline() }));
    updatePendingCount();

    const handleOnline = () => {
      setState((prev) => ({ ...prev, isOnline: true }));
      // Auto-sync when back online
      triggerSync();
    };

    const handleOffline = () => {
      setState((prev) => ({ ...prev, isOnline: false }));
    };

    const handleContactsUpdated = () => {
      updatePendingCount();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("contactsUpdated", handleContactsUpdated);

    // Periodic sync every 10 seconds when online
    const interval = setInterval(() => {
      if (isOnline() && !syncingRef.current) {
        triggerSync();
      }
    }, 10_000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("contactsUpdated", handleContactsUpdated);
      clearInterval(interval);
    };
  }, [triggerSync, updatePendingCount]);

  return { ...state, triggerSync };
}