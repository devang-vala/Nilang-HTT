"use client";

import { useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { validateQRData } from "@/lib/security/validateQRData";
import { Button } from "@/components/ui/button";
import {
  QrCode,
  X,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from "lucide-react";

interface InlineQRScannerProps {
  /** Called with the validated QR data string when a code is scanned */
  onScan: (data: string) => void;
  /** Current QR data value (controlled) */
  value?: string | null;
  /** Clear the QR data */
  onClear?: () => void;
}

export default function InlineQRScanner({
  onScan,
  value,
  onClear,
}: InlineQRScannerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decodeFromFile = async (file: File) => {
    setScanning(true);
    setError(null);

    try {
      const objectUrl = URL.createObjectURL(file);
      const codeReader = new BrowserMultiFormatReader();

      const img = new Image();
      img.src = objectUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image"));
      });

      const decoded = await codeReader.decodeFromImageElement(img);
      const rawText = decoded.getText();
      URL.revokeObjectURL(objectUrl);

      const validation = validateQRData(rawText);

      if (!validation.valid) {
        setError(validation.reason || "Invalid QR code");
        return;
      }

      onScan(validation.data || rawText);
    } catch {
      setError("No QR code found. Try a clearer image.");
    } finally {
      setScanning(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) decodeFromFile(file);
    e.target.value = "";
  };

  // If we already have a value, show it with a clear button
  if (value) {
    return (
      <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-md">
        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
        <span className="text-xs text-emerald-800 truncate flex-1" title={value}>
          {value.length > 60 ? value.slice(0, 57) + "…" : value}
        </span>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="p-1 text-emerald-500 hover:text-red-500 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-md gap-1.5 w-full"
        onClick={() => fileInputRef.current?.click()}
        disabled={scanning}
      >
        {scanning ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <QrCode className="h-4 w-4" />
        )}
        {scanning ? "Scanning…" : "Upload QR from gallery"}
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Error */}
      {error && (
        <div className="flex items-start gap-1.5 text-xs text-red-600">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
