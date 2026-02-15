"use client";

import { useEffect, useState, useCallback } from "react";
import { getDB } from "@/lib/db";
import { syncLeads, deleteLead } from "@/lib/leadService";
import { Lead } from "@/types/lead";
import { Button } from "@/components/ui/button";
import { Cloud, CloudOff, FileText, RefreshCw, Trash2 } from "lucide-react";

interface LeadListProps {
  isActive?: boolean;
}

export default function LeadList({ isActive = true }: LeadListProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadLeads = useCallback(async () => {
    try {
      const db = await getDB();
      const allLeads = await db.getAll("leads");
      allLeads.sort((a, b) => b.createdAt - a.createdAt);
      setLeads(allLeads);
    } catch (error) {
      console.error("Failed to load leads:", error);
    }
  }, []);

  useEffect(() => {
    loadLeads();
    const handleLeadsUpdate = () => loadLeads();
    window.addEventListener("leadsUpdated", handleLeadsUpdate);
    const interval = setInterval(loadLeads, 3000);
    return () => {
      window.removeEventListener("leadsUpdated", handleLeadsUpdate);
      clearInterval(interval);
    };
  }, [loadLeads]);

  useEffect(() => {
    if (isActive) loadLeads();
  }, [isActive, loadLeads]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncLeads();
      await loadLeads();
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (lead: Lead) => {
    if (!confirm("Delete this visiting card lead?")) return;
    setDeletingId(lead.id);
    try {
      await deleteLead(lead.id);
      setLeads((prev) => prev.filter((l) => l.id !== lead.id));
      await loadLeads();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">
          Visiting cards ({leads.length})
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl text-xs gap-1.5 border-border text-foreground hover:bg-muted"
          onClick={handleSync}
          disabled={syncing}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Sync to server"}
        </Button>
      </div>

      {leads.length === 0 && (
        <div className="text-center py-12 rounded-xl border border-dashed border-border bg-muted/30">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">No cards yet</p>
          <p className="text-xs text-muted-foreground">Use the upload area above to add a visiting card.</p>
        </div>
      )}

      {leads.map((lead) => (
        <LeadCard
          key={lead.id}
          lead={lead}
          onDelete={handleDelete}
          isDeleting={deletingId === lead.id}
        />
      ))}
    </div>
  );
}

function LeadCard({
  lead,
  onDelete,
  isDeleting,
}: {
  lead: Lead;
  onDelete: (lead: Lead) => void;
  isDeleting: boolean;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  useEffect(() => {
    const url = URL.createObjectURL(lead.image);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [lead.image]);

  return (
    <div className="bg-card border border-border rounded-xl p-4 relative">
      <div className="flex gap-4">
        <div className="shrink-0">
          {objectUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={objectUrl}
              alt="Card"
              className="w-24 h-24 object-cover rounded-xl border border-border"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                lead.ocrStatus === "done"
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground animate-pulse"
              }`}
            >
              {lead.ocrStatus === "done" ? "OCR done" : "Processing"}
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              {lead.syncStatus === "synced" ? (
                <Cloud className="h-3.5 w-3.5 text-foreground/50" />
              ) : (
                <CloudOff className="h-3.5 w-3.5 text-muted-foreground/40" />
              )}
              <span className="text-[10px]">
                {lead.syncStatus === "synced" ? "Synced" : "Pending"}
              </span>
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            <p className="font-medium text-muted-foreground mb-1">Extracted text</p>
            <pre className="bg-muted p-2.5 rounded-xl border border-border text-xs overflow-auto max-h-24 whitespace-pre-wrap text-foreground">
              {lead.rawText || "Waiting for OCR..."}
            </pre>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onDelete(lead)}
          disabled={isDeleting}
          className="absolute top-3 right-3 p-1.5 text-muted-foreground/40 hover:text-destructive rounded-lg transition-colors disabled:opacity-50"
          aria-label="Delete lead"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
