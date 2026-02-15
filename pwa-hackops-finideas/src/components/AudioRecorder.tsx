"use client";

import { useEffect, useState, useCallback } from "react";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { saveRecording, RecordingRecord } from "@/lib/audio/saveRecording";
import { getAllRecordings } from "@/lib/audio/getPending";
import { syncRecordings } from "@/lib/sync/syncRecording";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  // Load recordings on mount & listen for updates
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

  // Save the recorded audio to IndexedDB
  async function handleSave() {
    if (!audioBlob) return;
    setSaving(true);
    try {
      await saveRecording(audioBlob);
      clearRecording();
      await loadRecordings();

      // If online, immediately try to sync
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

  // Manual sync trigger
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
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
          online
            ? "bg-green-50 text-green-700 border border-green-200"
            : "bg-amber-50 text-amber-700 border border-amber-200"
        }`}
      >
        {online ? (
          <>
            <Wifi className="h-4 w-4" /> Online — recordings will sync
            automatically
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4" /> Offline — recordings saved locally
          </>
        )}
      </div>

      {/* Recorder Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mic className="h-5 w-5" />
            Voice Recorder
          </CardTitle>
          <CardDescription>
            Record audio notes. They&apos;re saved offline and transcribed via AI
            when online.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Recording controls */}
          <div className="flex items-center gap-4">
            {!isRecording && !audioBlob && (
              <Button
                onClick={startRecording}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                <Mic className="mr-2 h-4 w-4" />
                Start Recording
              </Button>
            )}

            {isRecording && (
              <>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                  </span>
                  <span className="text-lg font-mono font-semibold text-red-600">
                    {formatDuration(duration)}
                  </span>
                </div>
                <Button
                  onClick={stopRecording}
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  <Square className="mr-2 h-4 w-4" />
                  Stop
                </Button>
              </>
            )}

            {audioBlob && !isRecording && (
              <div className="flex items-center gap-3 w-full">
                <audio
                  src={audioUrl!}
                  controls
                  className="flex-1 h-10"
                />
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
                <Button variant="ghost" onClick={clearRecording}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-md">
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stats & Sync */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" /> {pendingCount} pending
          </span>
          <span className="flex items-center gap-1">
            <Check className="h-4 w-4" /> {syncedCount} transcribed
          </span>
        </div>
        {pendingCount > 0 && online && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
          >
            <Upload className="mr-2 h-4 w-4" />
            {syncing ? "Syncing…" : "Sync Now"}
          </Button>
        )}
      </div>

      {/* Recordings List */}
      {recordings.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">Recordings</h3>
          {recordings.map((rec) => (
            <Card
              key={rec.id}
              className={`${
                rec.synced
                  ? "border-green-200 bg-green-50/50"
                  : "border-amber-200 bg-amber-50/50"
              }`}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    {formatDate(rec.createdAt)}
                  </span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      rec.synced
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {rec.synced ? "Transcribed" : "Pending sync"}
                  </span>
                </div>

                {rec.transcript && (
                  <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap bg-white rounded-md p-3 border border-slate-100">
                    {rec.transcript}
                  </div>
                )}

                {!rec.synced && (
                  <p className="text-xs text-slate-400 italic">
                    Will be transcribed when online
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {recordings.length === 0 && (
        <div className="text-center py-8 text-slate-400">
          <Mic className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No recordings yet. Tap &quot;Start Recording&quot; to begin.</p>
        </div>
      )}
    </div>
  );
}
