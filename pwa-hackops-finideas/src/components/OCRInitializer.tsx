"use client";

import { useEffect } from "react";
import { initOCR } from "@/lib/ocr";
import { processPendingOCR } from "@/lib/leadService";
import { syncLeads } from "@/lib/leadService";

export default function OCRInitializer() {
  useEffect(() => {
    const handleOnline = async () => {
      try {
        await initOCR();
        await processPendingOCR();
        await syncLeads();
      } catch (error) {
        console.error("Error in OCR initialization:", error);
      }
    };

    window.addEventListener("online", handleOnline);

    // Initialize on mount if already online
    if (navigator.onLine) {
      handleOnline();
    }

    // Also poll periodically to process pending OCR and sync
    const interval = setInterval(async () => {
      if (navigator.onLine) {
        try {
          await processPendingOCR();
          await syncLeads();
        } catch (error) {
          console.error("Error in periodic OCR/sync:", error);
        }
      }
    }, 5000);

    return () => {
      window.removeEventListener("online", handleOnline);
      clearInterval(interval);
    };
  }, []);

  return null;
}
