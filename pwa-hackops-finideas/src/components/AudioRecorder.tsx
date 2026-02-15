"use client";

import { useEffect, useState, useCallback } from "react";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { saveRecording, RecordingRecord } from "@/lib/audio/saveRecording";
import { getAllRecordings } from "@/lib/audio/getPending";
import { syncRecordings } from "@/lib/sync/syncRecording";
import { Button } from "@/components/ui/button";
import { Mic, Square, Upload, Check, Clock, Wifi, WifiOff, Trash2 } from "lucide-react";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AudioRecorder() {
  const {
    isRecording,
    duration,
    audioBlob,
    audioUrl,
    error,
    startRecording,
    stopRecording,
    clearRecording,
  } = useAudioRecorder();

  const [recordings, setRecordings] = useState<RecordingRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [online, setOnline] = useState(true);

  const loadRecordings = useCallback(async () => {
    try {
      const all = await getAllRecordings();
      setRecordings(all);
    } catch {
      // DB not ready yet
    }
  }, []);

  useEffect(() => {
    loadRecordings();
    setOnline(navigator.onLine);

    const handleUpdate = () => loadRecordings();
    const handleOnline = () => {
      setOnline(true);
      syncRecordings().then(loadRecordings);
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener("recordingsUpdated", handleUpdate);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("recordingsUpdated", handleUpdate);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [loadRecordings]);

  async function handleSave() {
    if (!audioBlob) return;
    setSaving(true);
    try {
      await saveRecording(audioBlob);
      clearRecording();
      await loadRecordings();
      if (navigator.onLine) {
        setSyncing(true);
        await syncRecordings();
        await loadRecordings();
        setSyncing(false);
      }
    } catch (err) {
      console.error("Failed to save recording:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      await syncRecordings();
      await loadRecordings();
    } finally {
      setSyncing(false);
    }
  }

  const pendingCount = recordings.filter((r) => !r.synced).length;
  const syncedCount = recordings.filter((r) => r.synced).length;

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border ${
        online
          ? "bg-muted border-border text-foreground"
          : "bg-foreground border-foreground text-background"
      }`}>
        {online ? (
          <>
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            Online -- recordings will sync automatically
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4" />
            Offline -- recordings saved locally
          </>
        )}
      </div>

      {/* Recorder Card */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center">
              <Mic className="h-5 w-5 text-background" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Voice Recorder</h2>
              <p className="text-xs text-muted-foreground">
                Saved offline and transcribed via AI when online.
              </p>
            </div>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-4">
            {!isRecording && !audioBlob && (
              <Button
                onClick={startRecording}
                className="bg-destructive text-background hover:bg-destructive/90 rounded-xl"
              >
                <Mic className="mr-2 h-4 w-4" />
                Start Recording
              </Button>
            )}

            {isRecording && (
              <>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive" />
                  </span>
                  <span className="text-lg font-mono font-semibold text-foreground">
                    {formatDuration(duration)}
                  </span>
                </div>
                <Button
                  onClick={stopRecording}
                  variant="outline"
                  className="border-border text-foreground hover:bg-muted rounded-xl"
                >
                  <Square className="mr-2 h-4 w-4" />
                  Stop
                </Button>
              </>
            )}

            {audioBlob && !isRecording && (
              <div className="flex items-center gap-3 w-full">
                <audio src={audioUrl!} controls className="flex-1 h-10" />
                <Button onClick={handleSave} disabled={saving} className="rounded-xl bg-foreground text-background hover:bg-foreground/90">
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button variant="ghost" onClick={clearRecording} className="rounded-xl hover:bg-muted">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/5 px-3 py-2 rounded-xl">
              {error}
            </p>
          )}
        </div>
      </div>

      {/* Stats & Sync */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" /> {pendingCount} pending
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="h-4 w-4" /> {syncedCount} transcribed
          </span>
        </div>
        {pendingCount > 0 && online && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            className="rounded-xl border-border"
          >
            <Upload className="mr-2 h-4 w-4" />
            {syncing ? "Syncing..." : "Sync Now"}
          </Button>
        )}
      </div>

      {/* Recordings List */}
      {recordings.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Recordings</h3>
          {recordings.map((rec) => (
            <div
              key={rec.id}
              className={`bg-card rounded-xl border p-4 space-y-2 ${
                rec.synced ? "border-border" : "border-foreground/10"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {formatDate(rec.createdAt)}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  rec.synced
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {rec.synced ? "Transcribed" : "Pending"}
                </span>
              </div>

              {rec.transcript && (
                <div className="mt-2 text-sm text-foreground whitespace-pre-wrap bg-muted rounded-xl p-3 border border-border leading-relaxed">
                  {rec.transcript}
                </div>
              )}

              {!rec.synced && (
                <p className="text-xs text-muted-foreground italic">
                  Will be transcribed when online
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {recordings.length === 0 && (
        <div className="text-center py-12">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Mic className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">No recordings yet</p>
          <p className="text-xs text-muted-foreground">Tap &quot;Start Recording&quot; to begin.</p>
        </div>
      )}
    </div>
  );
}
