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
        <span className="text-sm font-semibold text-slate-900">
          Visiting cards ({leads.length})
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-md text-xs gap-1"
          onClick={handleSync}
          disabled={syncing}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing…" : "Sync to server"}
        </Button>
      </div>

      {leads.length === 0 && (
        <div className="text-center py-8 text-slate-500 rounded-lg border border-dashed border-slate-200 bg-slate-50/50">
          <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No cards yet. Use the upload area above to add a visiting card.</p>
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
    <div className="bg-white border border-slate-100 rounded-lg p-4 shadow-sm relative">
      <div className="flex gap-4">
        <div className="shrink-0">
          {objectUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={objectUrl}
              alt="Card"
              className="w-24 h-24 object-cover rounded-md border border-slate-200"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                lead.ocrStatus === "done"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
              }`}
            >
              {lead.ocrStatus === "done" ? "✓ OCR done" : "⏳ Processing"}
            </span>
            <span className="flex items-center gap-1 text-slate-500">
              {lead.syncStatus === "synced" ? (
                <Cloud className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <CloudOff className="h-3.5 w-3.5 text-slate-400" />
              )}
              <span className="text-[10px]">
                {lead.syncStatus === "synced" ? "Synced" : "Pending"}
              </span>
            </span>
          </div>
          <div className="text-xs text-slate-600">
            <p className="font-medium text-slate-500 mb-1">Extracted text</p>
            <pre className="bg-slate-50 p-2 rounded-md border border-slate-100 text-xs overflow-auto max-h-24 whitespace-pre-wrap">
              {lead.rawText || "Waiting for OCR…"}
            </pre>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onDelete(lead)}
          disabled={isDeleting}
          className="absolute top-3 right-3 p-1.5 text-slate-300 hover:text-red-500 rounded-lg transition-colors disabled:opacity-50"
          aria-label="Delete lead"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
