"use client";

import { useState } from "react";
import { saveLead, processLeadOCR } from "@/lib/leadService";
import { v4 as uuidv4 } from "uuid";
import { Camera, Loader2 } from "lucide-react";

export default function UploadCard() {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const id = uuidv4();
    setIsProcessing(true);

    try {
      await saveLead(id, file);
      const processed = await processLeadOCR(id);
      if (processed) {
        // Event already dispatched by leadService
      }
      e.target.value = "";
    } catch (error) {
      console.error("Failed to save lead:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-4">
      <label className="block cursor-pointer">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleUpload}
          disabled={isProcessing}
          className="hidden"
        />
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
          {isProcessing ? (
            <>
              <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
              <span className="text-sm font-medium text-muted-foreground">
                Processing OCR...
              </span>
            </>
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-foreground">
                <Camera className="h-6 w-6 text-background" />
              </div>
              <span className="text-sm font-medium text-foreground">
                Tap to scan or upload visiting card
              </span>
              <span className="text-xs text-muted-foreground">
                Image will be saved and text extracted locally
              </span>
            </>
          )}
        </div>
      </label>
    </div>
  );
}
