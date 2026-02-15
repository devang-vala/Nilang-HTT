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

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    try {
      const codeReader = new BrowserMultiFormatReader();

      const img = new Image();
      img.src = objectUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image"));
      });

      const decoded = await codeReader.decodeFromImageElement(img);
      const rawText = decoded.getText();

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
      {!result && (
        <div className="flex flex-col items-center gap-5 py-6">
          <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center">
            <QrCode className="h-10 w-10 text-muted-foreground" />
          </div>

          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-foreground">
              Scan a QR Code
            </p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Take a photo of the QR code or pick one from your gallery
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => cameraInputRef.current?.click()}
              className="gap-2 rounded-xl bg-foreground text-background hover:bg-foreground/90"
              disabled={scanning}
            >
              {scanning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImagePlus className="h-4 w-4" />
              )}
              {scanning ? "Scanning..." : "Upload QR from gallery"}
            </Button>
          </div>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCapture}
          />
        </div>
      )}

      {preview && !result && (
        <div className="rounded-xl overflow-hidden border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Captured QR"
            className="w-full max-h-64 object-contain bg-muted"
          />
        </div>
      )}

      {scanning && (
        <div className="flex items-center justify-center gap-2 py-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Decoding QR code...</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/5 text-destructive text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="space-y-3">
          {preview && (
            <div className="rounded-xl overflow-hidden border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Scanned QR"
                className="w-full max-h-48 object-contain bg-muted"
              />
            </div>
          )}

          <div className="flex items-start gap-2 p-3 rounded-xl bg-muted text-foreground text-sm border border-border">
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
            <span className="font-medium">QR Code scanned!</span>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card">
            <p className="text-xs text-muted-foreground mb-1">
              {result.type === "url" ? "URL" : "Text"}
            </p>
            {result.type === "url" ? (
              <a
                href={result.data}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-foreground underline underline-offset-2 hover:text-foreground/70 break-all"
              >
                {result.data}
              </a>
            ) : (
              <p className="text-sm text-foreground break-all">{result.data}</p>
            )}
          </div>

          <Button onClick={resetScanner} variant="outline" className="w-full gap-2 rounded-xl border-border text-foreground hover:bg-muted">
            <RotateCcw className="h-4 w-4" />
            Scan Another
          </Button>
        </div>
      )}

      {error && !result && !scanning && (
        <div className="flex gap-3 justify-center">
          <Button
            onClick={() => {
              resetScanner();
              setTimeout(() => cameraInputRef.current?.click(), 100);
            }}
            variant="outline"
            size="sm"
            className="gap-2 rounded-xl border-border text-foreground hover:bg-muted"
          >
            <RotateCcw className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}
