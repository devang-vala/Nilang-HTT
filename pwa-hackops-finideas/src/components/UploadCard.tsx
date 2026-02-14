"use client";

import { useState } from "react";
import { saveLead, processLeadOCR } from "@/lib/leadService";
import { v4 as uuidv4 } from "uuid";

export default function UploadCard() {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const id = uuidv4();
    setIsProcessing(true);

    try {
      // Save the lead first
      await saveLead(id, file);
      
      // Immediately try to process OCR
      const processed = await processLeadOCR(id);
      
      if (processed) {
        alert("Lead saved and OCR completed!");
      } else {
        alert("Lead saved. OCR will process in background.");
      }
      
      // Clear the input so the same file can be uploaded again
      e.target.value = "";
    } catch (error) {
      console.error("Failed to save lead:", error);
      alert("Failed to save lead. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6 border border-dashed border-gray-300 rounded-lg bg-gray-50">
      <label className="block">
        <span className="text-sm font-medium text-gray-700 mb-2 block">
          Upload Business Card
        </span>
        <input
          type="file"
          accept="image/*"
          onChange={handleUpload}
          disabled={isProcessing}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
        />
      </label>
      {isProcessing && (
        <div className="mt-3 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-blue-600 font-medium">Processing OCR...</p>
        </div>
      )}
    </div>
  );
}
