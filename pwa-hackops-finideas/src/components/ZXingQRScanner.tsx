"use client";

import { useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { validateQRData } from "@/lib/security/validateQRData";
import { Button } from "@/components/ui/button";
import {
  ImagePlus,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  QrCode,
  Loader2,
} from "lucide-react";

interface QRResult {
  valid: boolean;
  type?: string;
  data?: string;
  reason?: string;
}

export default function ZXingQRScanner() {
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [result, setResult] = useState<QRResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const decodeFromFile = async (file: File) => {
    setScanning(true);
    setError(null);
    setResult(null);

    // Show preview of captured image
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    try {
      const codeReader = new BrowserMultiFormatReader();

      // Create an image element to decode from
      const img = new Image();
      img.src = objectUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image"));
      });

      const decoded = await codeReader.decodeFromImageElement(img);
      const rawText = decoded.getText();

      // Validate the QR data
      const validation = validateQRData(rawText);

      if (!validation.valid) {
        setError(validation.reason || "Invalid QR code");
        return;
      }

      setResult(validation);
    } catch {
      setError("No QR code found in image. Try again with a clearer photo.");
    } finally {
      setScanning(false);
    }
  };

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) decodeFromFile(file);
    // Reset so the same photo can be retried
    e.target.value = "";
  };

  const resetScanner = () => {
    setResult(null);
    setError(null);
    setPreview(null);
    setScanning(false);
  };

  return (
    <div className="space-y-4">
      {/* Prompt area — visible before any result */}
      {!result && (
        <div className="flex flex-col items-center gap-5 py-6">
          <div className="h-20 w-20 rounded-2xl bg-slate-100 flex items-center justify-center">
            <QrCode className="h-10 w-10 text-slate-400" />
          </div>

          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-slate-700">
              Scan a QR Code
            </p>
            <p className="text-xs text-slate-500 max-w-xs">
              Take a photo of the QR code or pick one from your gallery
            </p>
          </div>

          <div className="flex gap-3">
            {/* Pick from gallery — opens file picker on all devices */}
            <Button
              onClick={() => cameraInputRef.current?.click()}
              className="gap-2"
              disabled={scanning}
            >
              {scanning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImagePlus className="h-4 w-4" />
              )}
              {scanning ? "Scanning…" : "Upload QR from gallery"}
            </Button>
          </div>

          {/* Hidden file input — no capture attr so it opens gallery/file picker */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCapture}
          />
        </div>
      )}

      {/* Image preview */}
      {preview && !result && (
        <div className="rounded-lg overflow-hidden border border-slate-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Captured QR"
            className="w-full max-h-64 object-contain bg-slate-50"
          />
        </div>
      )}

      {/* Scanning indicator */}
      {scanning && (
        <div className="flex items-center justify-center gap-2 py-3">
          <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
          <span className="text-sm text-slate-500">Decoding QR code…</span>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success result */}
      {result && (
        <div className="space-y-3">
          {preview && (
            <div className="rounded-lg overflow-hidden border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Scanned QR"
                className="w-full max-h-48 object-contain bg-slate-50"
              />
            </div>
          )}

          <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 text-green-700 text-sm">
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
            <span className="font-medium">QR Code scanned!</span>
          </div>

          <div className="p-4 rounded-lg border border-slate-100 bg-white">
            <p className="text-xs text-slate-500 mb-1">
              {result.type === "url" ? "URL" : "Text"}
            </p>
            {result.type === "url" ? (
              <a
                href={result.data}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline break-all"
              >
                {result.data}
              </a>
            ) : (
              <p className="text-sm text-slate-900 break-all">{result.data}</p>
            )}
          </div>

          <Button onClick={resetScanner} variant="outline" className="w-full gap-2">
            <RotateCcw className="h-4 w-4" />
            Scan Another
          </Button>
        </div>
      )}

      {/* Retry button when error (but no result) */}
      {error && !result && !scanning && (
        <div className="flex gap-3 justify-center">
          <Button
            onClick={() => {
              resetScanner();
              setTimeout(() => cameraInputRef.current?.click(), 100);
            }}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}
