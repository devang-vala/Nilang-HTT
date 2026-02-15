"use client";

import { useState, useRef } from "react";
import { saveContactLocally, isOnline, syncContactToPayload } from "@/lib/contactService";
import { initOCR, isOCRReady, runOCR } from "@/lib/ocr";
import { parseOcrText } from "@/lib/parseOcrText";
import { getCurrentLocation } from "@/lib/location/getCurrentLocation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  User,
  Building2,
  Phone,
  Mail,
  Camera,
  ScanLine,
  CheckCircle2,
  Loader2,
  WifiOff,
  Wifi,
  Merge,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import InlineQRScanner from "@/components/InlineQRScanner";

export default function StallForm() {
  const [form, setForm] = useState({
    name: "",
    companyName: "",
    contactNo: "",
    email: "",
    tags: "warm" as "hot" | "warm" | "cold",
  });
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedMerged, setSubmittedMerged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocrScanning, setOcrScanning] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const submitInProgressRef = useRef(false);

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleScanCard = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrScanning(true);
    setError(null);
    try {
      if (!isOCRReady()) await initOCR();
      const rawText = await runOCR(file);
      const parsed = parseOcrText(rawText);
      setForm((prev) => ({
        ...prev,
        name: prev.name || parsed.name,
        companyName: prev.companyName || parsed.companyName,
        contactNo: prev.contactNo || parsed.contactNo,
        email: prev.email || parsed.email,
      }));
      if (!photoPreview) {
        setPhoto(file);
        setPhotoPreview(URL.createObjectURL(file));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "OCR failed");
    } finally {
      setOcrScanning(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitInProgressRef.current) return;
    submitInProgressRef.current = true;
    setIsSubmitting(true);
    setError(null);

    try {
      // Capture geolocation (non-blocking — still saves if denied/unavailable)
      let latitude: number | null = null;
      let longitude: number | null = null;
      try {
        const position = await getCurrentLocation();
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      } catch {
        // Geolocation denied or unavailable — continue without it
      }

      const { contact, merged } = await saveContactLocally({
        ...form,
        captureMode: "stall",
        photo,
        voiceNote: null,
        latitude,
        longitude,
        qrData,
      });

      if (isOnline()) {
        void syncContactToPayload(contact);
      }

      setSubmitted(true);
      setSubmittedMerged(merged);
      setForm({ name: "", companyName: "", contactNo: "", email: "", tags: "warm" });
      setPhoto(null);
      setPhotoPreview(null);
      setQrData(null);

      setTimeout(() => {
        setSubmitted(false);
        setSubmittedMerged(false);
      }, 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      submitInProgressRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Status Bar */}
      <div className="flex items-center justify-between text-xs px-1">
        <div className="flex items-center gap-1.5">
          {isOnline() ? (
            <>
              <Wifi className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-emerald-600 font-medium">Online — will sync immediately</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-amber-600 font-medium">Offline — saved locally</span>
            </>
          )}
        </div>
      </div>

      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="stall-name" className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          Full Name *
        </Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            id="stall-name"
            type="text"
            required
            minLength={2}
            maxLength={100}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="John Doe"
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Company */}
      <div className="space-y-1.5">
        <Label htmlFor="stall-company" className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          Company
        </Label>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            id="stall-company"
            type="text"
            maxLength={150}
            value={form.companyName}
            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            placeholder="Acme Corp"
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Phone & Email Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="stall-phone" className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Phone *
          </Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              id="stall-phone"
              type="tel"
              required
              value={form.contactNo}
              onChange={(e) => setForm({ ...form, contactNo: e.target.value })}
              placeholder="+91 98765 43210"
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="stall-email" className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Email *
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              id="stall-email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="john@acme.com"
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
            />
          </div>
        </div>
      </div>

      {/* Priority Tags */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          Lead Priority
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {(["hot", "warm", "cold"] as const).map((tag) => (
            <button
              type="button"
              key={tag}
              onClick={() => setForm({ ...form, tags: tag })}
              className={`py-2.5 rounded-md text-sm font-medium transition-all border
                ${form.tags === tag
                  ? tag === "hot"
                    ? "bg-red-50 border-red-300 text-red-700 ring-2 ring-red-200"
                    : tag === "warm"
                    ? "bg-amber-50 border-amber-300 text-amber-700 ring-2 ring-amber-200"
                    : "bg-blue-50 border-blue-300 text-blue-700 ring-2 ring-blue-200"
                  : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                }`}
            >
              {tag === "hot" ? "🔥 Hot" : tag === "warm" ? "🌡️ Warm" : "❄️ Cold"}
            </button>
          ))}
        </div>
      </div>

      {/* Scan card (OCR) + Photo */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          Scan card or photo
        </Label>
        <div className="flex gap-2">
          <input
            ref={scanInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleScanCard}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-md gap-1.5 flex-1"
            onClick={() => scanInputRef.current?.click()}
            disabled={ocrScanning}
          >
            {ocrScanning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ScanLine className="h-4 w-4" />
            )}
            {ocrScanning ? "Scanning…" : "Scan visiting card"}
          </Button>
          <label className="flex-1 flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-slate-200 rounded-md cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-all text-sm text-slate-500">
            <Camera className="h-4 w-4" />
            {photoPreview ? "Change photo" : "Photo"}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoCapture}
              className="hidden"
            />
          </label>
        </div>
        {photoPreview && (
          <div className="relative mt-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoPreview}
              alt="Preview"
              className="w-full h-32 object-cover rounded-md border border-slate-200"
            />
          </div>
        )}
      </div>

      {/* QR Code Scanner (optional) */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          Scan QR Code <span className="text-slate-400 normal-case">(optional)</span>
        </Label>
        <InlineQRScanner
          value={qrData}
          onScan={(data) => setQrData(data)}
          onClear={() => setQrData(null)}
        />
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive" className="rounded-md">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success / Duplicate message (product-style) */}
      {submitted && (
        <Alert
          className={`rounded-md border ${
            submittedMerged
              ? "bg-blue-50 border-blue-200 text-blue-800 [&_svg]:text-blue-600"
              : "bg-emerald-50 border-emerald-200 text-emerald-800 [&_svg]:text-emerald-600"
          }`}
        >
          {submittedMerged ? (
            <Merge className="size-4" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
          <AlertDescription className="col-start-2">
            {submittedMerged ? (
              <>
                <span className="font-medium">Existing contact updated</span>
                <span className="block text-xs opacity-90 mt-0.5">
                  We found a contact with the same email or phone and merged your details.
                </span>
              </>
            ) : (
              "Contact saved!"
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Submit */}
      <Button
        type="submit"
        disabled={isSubmitting || submitted}
        className="w-full py-6 rounded-md text-sm font-semibold bg-slate-900 hover:bg-slate-800 transition-all disabled:opacity-50"
      >
        {submitted ? (
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            Contact Saved!
          </span>
        ) : isSubmitting ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </span>
        ) : (
          "Save Contact"
        )}
      </Button>
    </form>
  );
}