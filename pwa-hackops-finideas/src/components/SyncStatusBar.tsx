"use client";

import { useSync } from "@/hooks/use-sync";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Cloud,
  CloudOff,
  CheckCircle2,
} from "lucide-react";

export default function SyncStatusBar() {
  const { isOnline, isSyncing, pendingCount, triggerSync, lastSyncResult } =
    useSync();

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 flex items-center justify-between text-xs font-medium transition-colors
      ${
        !isOnline
          ? "bg-foreground text-background"
          : pendingCount > 0
          ? "bg-foreground/90 text-background"
          : "bg-foreground text-background"
      }`}
    >
      <div className="flex items-center gap-2">
        {isOnline ? (
          <Wifi className="h-3.5 w-3.5" />
        ) : (
          <WifiOff className="h-3.5 w-3.5" />
        )}
        <span>
          {!isOnline
            ? "Offline -- changes saved locally"
            : pendingCount > 0
            ? `${pendingCount} contact${pendingCount > 1 ? "s" : ""} pending sync`
            : "All synced"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {lastSyncResult && lastSyncResult.synced > 0 && (
          <span className="flex items-center gap-1 opacity-75">
            <CheckCircle2 className="h-3 w-3" />
            {lastSyncResult.synced} synced
          </span>
        )}
        {isOnline && pendingCount > 0 && (
          <button
            onClick={triggerSync}
            disabled={isSyncing}
            className="flex items-center gap-1 px-2 py-0.5 bg-background/10 rounded-lg hover:bg-background/20 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`}
            />
            {isSyncing ? "Syncing..." : "Sync Now"}
          </button>
        )}
        {isOnline && pendingCount === 0 && (
          <Cloud className="h-3.5 w-3.5 opacity-75" />
        )}
        {!isOnline && <CloudOff className="h-3.5 w-3.5 opacity-75" />}
      </div>
    </div>
  );
}
