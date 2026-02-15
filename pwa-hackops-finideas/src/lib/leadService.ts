"use client";
import { getDB } from "./db";
import { Lead } from "@/types/lead";
import { runOCR, isOCRReady, initOCR } from "./ocr";

export async function saveLead(id: string, image: Blob): Promise<void> {
  const db = await getDB();

  let rawText = "";
  let ocrStatus: "pending" | "done" = "pending";

  if (isOCRReady()) {
    try {
      rawText = await runOCR(image);
      ocrStatus = "done";
    } catch {
      ocrStatus = "pending";
    }
  }

  const lead: Lead = {
    id,
    image,
    rawText,
    ocrStatus,
    syncStatus: "pending",
    createdAt: Date.now(),
  };

  await db.put("leads", lead);
  
  // Dispatch custom event to notify UI of changes
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("leadsUpdated"));
  }
}

// Process OCR for a specific lead immediately
export async function processLeadOCR(leadId: string): Promise<boolean> {
  try {
    // Ensure OCR is initialized
    if (!isOCRReady()) {
      await initOCR();
    }

    const db = await getDB();
    const lead: Lead | undefined = await db.get("leads", leadId);
    
    if (!lead) {
      console.error("Lead not found:", leadId);
      return false;
    }

    if (lead.ocrStatus === "pending") {
      const text = await runOCR(lead.image);
      lead.rawText = text;
      lead.ocrStatus = "done";
      await db.put("leads", lead);
      
      // Notify UI
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("leadsUpdated"));
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Error processing OCR:", error);
    return false;
  }
}

export async function processPendingOCR(): Promise<void> {
  const db = await getDB();
  const allLeads: Lead[] = await db.getAll("leads");
  let updated = false;

  for (const lead of allLeads) {
    if (lead.ocrStatus === "pending") {
      try {
        const text = await runOCR(lead.image);
        lead.rawText = text;
        lead.ocrStatus = "done";
        await db.put("leads", lead);
        updated = true;
      } catch {
        console.log("OCR still not ready");
      }
    }
  }
  
  // Dispatch event if any leads were updated
  if (updated && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("leadsUpdated"));
  }
}

export async function syncLeads(): Promise<{ synced: number; failed: number }> {
  const db = await getDB();
  const allLeads: Lead[] = await db.getAll("leads");
  let synced = 0;
  let failed = 0;

  for (const lead of allLeads) {
    if (lead.ocrStatus !== "done" || lead.syncStatus !== "pending") continue;
    try {
      const response = await fetch("/api/leads/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          rawText: lead.rawText,
          localId: lead.id,
        }),
      });

      if (!response.ok) {
        failed++;
        continue;
      }

      const result = await response.json();
      lead.syncStatus = "synced";
      lead.payloadId = result.data?.id;
      await db.put("leads", lead);
      synced++;
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("leadsUpdated"));
      }
    } catch (err) {
      console.error("OCR lead sync failed:", err);
      failed++;
    }
  }

  return { synced, failed };
}

export async function deleteLead(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("leads", id);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("leadsUpdated"));
  }
}

