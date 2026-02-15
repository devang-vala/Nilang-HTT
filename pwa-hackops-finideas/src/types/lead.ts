// Local IndexedDB lead (offline-first, visiting card OCR)
export interface Lead {
  id: string;
  image: Blob;
  rawText: string;
  ocrStatus: "pending" | "done";
  syncStatus: "pending" | "synced" | "error";
  payloadId?: string; // Payload CMS lead id after sync
  createdAt: number;
}

// Follow-up tag value (from curated Finideas list)
export type FollowUpTagValue = string;

// Contact form data for both Stall & Field modes
export interface ContactFormData {
  id: string;
  name: string;
  companyName?: string;
  contactNo: string;
  email: string;
  tags: "hot" | "warm" | "cold";
  captureMode: "stall" | "field";
  // Optional media stored as blobs for offline
  photo?: Blob | null;
  voiceNote?: Blob | null;
  /** Speech-to-text from voice note (stored in DB, not the file) */
  voiceNoteTranscript?: string | null;
  /** Follow-up tags: from server as { value, label }[], locally as string[] (backend-assigned from transcript) */
  followUpTags?: (FollowUpTagValue | { value: string; label: string })[];
  /** @deprecated use voiceNoteTranscript */
  audioTranscript?: string;
  notes?: string;
  /** Data captured from QR code scan (URL or plain text) */
  qrData?: string | null;
  // Location data (captured via Geolocation API on form submit)
  latitude?: number | null;
  longitude?: number | null;
  /** Resolved via reverse geocoding (server-side) */
  locationName?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  // Sync metadata
  syncStatus: "pending" | "synced" | "error";
  syncError?: string;
  payloadId?: string; // ID from Payload CMS after sync
  createdAt: number;
  updatedAt: number;
}

// Payload API response shape
export interface PayloadLeadResponse {
  id: string;
  name: string;
  companyName?: string;
  contactNo: string;
  email: string;
  tags: "hot" | "warm" | "cold";
  createdAt: string;
  updatedAt: string;
}

export interface PayloadLeadsListResponse {
  docs: PayloadLeadResponse[];
  totalDocs: number;
  totalPages: number;
  page: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}