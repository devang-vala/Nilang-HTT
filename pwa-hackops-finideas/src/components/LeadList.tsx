"use client";

import { useEffect, useState } from "react";
import { getDB } from "@/lib/db";
import { Lead } from "@/types/lead";

export default function LeadList() {
  const [leads, setLeads] = useState<Lead[]>([]);

  const loadLeads = async () => {
    try {
      const db = await getDB();
      const allLeads = await db.getAll("leads");
      // Sort by creation date, newest first
      allLeads.sort((a, b) => b.createdAt - a.createdAt);
      setLeads(allLeads);
    } catch (error) {
      console.error("Failed to load leads:", error);
    }
  };

  useEffect(() => {
    loadLeads();

    // Listen for custom events to refresh leads
    const handleLeadsUpdate = () => {
      loadLeads();
    };

    window.addEventListener("leadsUpdated", handleLeadsUpdate);

    // Poll for updates every 2 seconds to catch OCR completion faster
    const interval = setInterval(loadLeads, 2000);

    return () => {
      window.removeEventListener("leadsUpdated", handleLeadsUpdate);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">
        Stored Leads ({leads.length})
      </h2>

      {leads.length === 0 && (
        <p className="text-gray-500 italic">No leads yet. Upload a business card to get started.</p>
      )}

      {leads.map((lead) => (
        <div
          key={lead.id}
          className="border p-4 mb-4 rounded bg-white shadow"
        >
          <div className="flex gap-4">
            <div className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={URL.createObjectURL(lead.image)} 
                alt="Business card" 
                className="w-32 h-32 object-cover rounded border"
              />
            </div>
            <div className="grow">
              <p className="text-xs text-gray-500 mb-2">ID: {lead.id.substring(0, 8)}...</p>
              <p className="mb-1">
                <strong>OCR Status:</strong>{" "}
                <span className={lead.ocrStatus === "done" ? "text-green-600 font-semibold" : "text-yellow-600 font-semibold animate-pulse"}>
                  {lead.ocrStatus === "done" ? "✓ Completed" : "⏳ Processing..."}
                </span>
              </p>
              <p className="mb-2">
                <strong>Sync Status:</strong>{" "}
                <span className={lead.syncStatus === "synced" ? "text-green-600 font-semibold" : "text-gray-600"}>
                  {lead.syncStatus === "synced" ? "✓ Synced" : "○ Pending"}
                </span>
              </p>
              <div>
                <p className="font-semibold mb-1">Extracted Text:</p>
                <pre className="bg-gray-100 p-2 text-sm overflow-auto rounded border max-h-32">
                  {lead.rawText || "Waiting for OCR to complete..."}
                </pre>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
