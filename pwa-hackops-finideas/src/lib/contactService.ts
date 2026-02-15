"use client";

import { getDB } from "./db";
import { ContactFormData } from "@/types/lead";
import { v4 as uuidv4 } from "uuid";

// Canonical form: digits only, no +. Indian +91 X and X both become 10 digits for comparison/storage.
function toCanonicalPhone(phone: string | undefined): string {
  if (!phone) return "";
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length > 10) digits = digits.slice(1);
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length >= 10 && /^[6-9]/.test(digits.slice(-10))) digits = digits.slice(-10);
  return digits.length >= 10 ? digits : phone.trim();
}

// Same as toCanonicalPhone so +91 X and X match when deduplicating/merging
function normalizePhone(phone: string | undefined): string {
  return toCanonicalPhone(phone);
}

function normalizeEmail(email: string | undefined): string {
  return (email || "").trim().toLowerCase();
}

// Duplicate detection: match by normalized email or canonical phone
function findDuplicate(
  contact: ContactFormData,
  existingContacts: ContactFormData[]
): ContactFormData | undefined {
  const emailNorm = normalizeEmail(contact.email);
  const phoneCanon = toCanonicalPhone(contact.contactNo);
  if (!emailNorm && !phoneCanon) return undefined;
  return existingContacts.find((c) => {
    if (emailNorm && normalizeEmail(c.email) === emailNorm) return true;
    if (phoneCanon && toCanonicalPhone(c.contactNo) === phoneCanon) return true;
    return false;
  });
}

export interface SaveContactResult {
  contact: ContactFormData;
  merged: boolean;
}

// ─── Save Contact Locally ────────────────────────────────────────
export async function saveContactLocally(
  data: Omit<ContactFormData, "id" | "syncStatus" | "createdAt" | "updatedAt">
): Promise<SaveContactResult> {
  const db = await getDB();
  const now = Date.now();

  const contact: ContactFormData = {
    ...data,
    contactNo: toCanonicalPhone(data.contactNo) || data.contactNo,
    id: uuidv4(),
    syncStatus: "pending",
    createdAt: now,
    updatedAt: now,
  };

  const existingContacts: ContactFormData[] = await db.getAll("contacts");
  const duplicate = findDuplicate(contact, existingContacts);

  if (duplicate) {
    const merged: ContactFormData = {
      ...duplicate,
      name: contact.name || duplicate.name,
      companyName: contact.companyName || duplicate.companyName,
      contactNo: contact.contactNo || duplicate.contactNo,
      email: contact.email || duplicate.email,
      tags: contact.tags,
      captureMode: contact.captureMode,
      notes: [duplicate.notes, contact.notes].filter(Boolean).join("\n---\n"),
      photo: contact.photo || duplicate.photo,
      voiceNote: contact.voiceNote || duplicate.voiceNote,
      voiceNoteTranscript: contact.voiceNoteTranscript || duplicate.voiceNoteTranscript,
      followUpTags: contact.followUpTags?.length ? contact.followUpTags : duplicate.followUpTags,
      audioTranscript: contact.audioTranscript || duplicate.audioTranscript,
      latitude: contact.latitude ?? duplicate.latitude,
      longitude: contact.longitude ?? duplicate.longitude,
      locationName: contact.locationName ?? duplicate.locationName,
      city: contact.city ?? duplicate.city,
      state: contact.state ?? duplicate.state,
      country: contact.country ?? duplicate.country,
      syncStatus: "pending",
      updatedAt: now,
    };
    merged.contactNo = toCanonicalPhone(merged.contactNo) || merged.contactNo;
    await db.put("contacts", merged);
    dispatchContactsUpdated();
    return { contact: merged, merged: true };
  }

  await db.put("contacts", contact);
  dispatchContactsUpdated();
  return { contact, merged: false };
}

// ─── Get All Contacts ────────────────────────────────────────────
export async function getAllContacts(): Promise<ContactFormData[]> {
  const db = await getDB();
  const contacts: ContactFormData[] = await db.getAll("contacts");
  return contacts.sort((a, b) => b.createdAt - a.createdAt);
}

// Server lead shape from GET /api/leads (followUpTags include labels from backend)
export interface ServerLeadRecord {
  id: string;
  name: string;
  companyName?: string | null;
  contactNo: string;
  email: string;
  tags: string;
  voiceNoteTranscript?: string | null;
  followUpTags?: { value: string; label: string }[] | null;
  createdAt: string;
  updatedAt: string;
}

export type MergedContact = ContactFormData & { source: "local" | "server" };

/** Fetch leads from server (for unified contacts list) */
export async function fetchServerLeads(limit = 500): Promise<ServerLeadRecord[]> {
  try {
    const res = await fetch(`/api/leads?limit=${limit}&page=1`, { credentials: "include" });
    if (!res.ok) return [];
    const json = await res.json();
    const data = json.data ?? [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/** Unified list: local contacts + server-only leads; merge server followUpTags/transcript into local when same phone */
export async function getMergedContactsForDisplay(): Promise<MergedContact[]> {
  const [local, serverLeads] = await Promise.all([getAllContacts(), fetchServerLeads()]);
  const serverByPhone = new Map<string, ServerLeadRecord>();
  for (const lead of serverLeads) {
    const key = normalizePhone(lead.contactNo);
    if (key) serverByPhone.set(key, lead);
  }
  const merged: MergedContact[] = local.map((c) => {
    const key = normalizePhone(c.contactNo);
    const server = key ? serverByPhone.get(key) : undefined;
    if (server) {
      serverByPhone.delete(key);
      return {
        ...c,
        voiceNoteTranscript: server.voiceNoteTranscript ?? c.voiceNoteTranscript,
        followUpTags: server.followUpTags ?? c.followUpTags,
        source: "local" as const,
      };
    }
    return { ...c, source: "local" as const };
  });
  for (const lead of serverByPhone.values()) {
    const isField =
      (lead.followUpTags?.length ?? 0) > 0 || !!lead.voiceNoteTranscript;
    merged.push({
      id: lead.id,
      name: lead.name,
      companyName: lead.companyName ?? undefined,
      contactNo: lead.contactNo,
      email: lead.email,
      tags: lead.tags as "hot" | "warm" | "cold",
      voiceNoteTranscript: lead.voiceNoteTranscript ?? undefined,
      followUpTags: lead.followUpTags ?? undefined,
      captureMode: isField ? "field" : "stall",
      syncStatus: "synced",
      createdAt: new Date(lead.createdAt).getTime(),
      updatedAt: new Date(lead.updatedAt).getTime(),
      source: "server",
    });
  }
  return merged.sort((a, b) => b.createdAt - a.createdAt);
}

// ─── Get Pending Contacts ────────────────────────────────────────
export async function getPendingContacts(): Promise<ContactFormData[]> {
  const db = await getDB();
  const contacts: ContactFormData[] = await db.getAllFromIndex(
    "contacts",
    "syncStatus",
    "pending"
  );
  return contacts;
}

// ─── Transcribe voice note (field: store text in DB only) ───────
export async function transcribeVoiceNote(blob: Blob): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append("audio", blob);
    const res = await fetch("/api/transcribe", { method: "POST", body: formData });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.text ?? data?.transcript ?? null;
    return typeof text === "string" ? text.trim() || null : null;
  } catch {
    return null;
  }
}

// ─── Upload Media to Payload ─────────────────────────────────────
async function uploadMediaToPayload(
  blob: Blob,
  filename: string,
  alt: string
): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append("file", blob, filename);
    formData.append("alt", alt);

    const res = await fetch("/api/media", {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.doc?.id || null;
  } catch {
    return null;
  }
}

const syncingContactIds = new Set<string>();

// ─── Sync Single Contact to Payload ──────────────────────────────
export async function syncContactToPayload(
  contact: ContactFormData
): Promise<boolean> {
  if (syncingContactIds.has(contact.id)) return true;
  syncingContactIds.add(contact.id);
  try {
    const isField = contact.captureMode === "field";

    // Field: transcribe voice note if we have audio but no transcript yet (store text in DB only, no file upload)
    let resolvedTranscript = contact.voiceNoteTranscript ?? contact.audioTranscript ?? null;
    if (isField && contact.voiceNote && !resolvedTranscript) {
      const transcript = await transcribeVoiceNote(contact.voiceNote);
      if (transcript) {
        resolvedTranscript = transcript;
        contact.voiceNoteTranscript = transcript;
        const db = await getDB();
        contact.updatedAt = Date.now();
        await db.put("contacts", contact);
      }
    }

    // Upload photo; for non-field also upload voice file; field stores only transcript
    const photoId = contact.photo
      ? await uploadMediaToPayload(
          contact.photo,
          `photo-${contact.id}.jpg`,
          `Photo of ${contact.name}`
        )
      : null;
    const voiceNoteId =
      !isField && contact.voiceNote
        ? await uploadMediaToPayload(
            contact.voiceNote,
            `voice-${contact.id}.webm`,
            `Voice note for ${contact.name}`
          )
        : null;

    const contactNoCanonical = toCanonicalPhone(contact.contactNo) || contact.contactNo;
    const payload: Record<string, unknown> = {
      name: contact.name,
      companyName: contact.companyName || "",
      contactNo: contactNoCanonical,
      email: contact.email,
      tags: contact.tags,
    };

    if (photoId) payload.photo = photoId;
    if (voiceNoteId) payload.voiceNote = voiceNoteId;
    if (resolvedTranscript) payload.voiceNoteTranscript = resolvedTranscript;
    if (contact.followUpTags?.length)
      payload.followUpTags = contact.followUpTags.slice(0, 2);

    // Send location coordinates for server-side reverse geocoding
    if (contact.latitude != null) payload.latitude = contact.latitude;
    if (contact.longitude != null) payload.longitude = contact.longitude;
    // If we already have resolved location, send it too
    if (contact.locationName) payload.locationName = contact.locationName;
    if (contact.city) payload.city = contact.city;
    if (contact.state) payload.state = contact.state;
    if (contact.country) payload.country = contact.country;

    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Payload API error: ${res.status}`);
    }

    const result = await res.json();

    // Update local record
    const db = await getDB();
    contact.syncStatus = "synced";
    contact.payloadId = result.data?.id;
    contact.updatedAt = Date.now();
    await db.put("contacts", contact);

    dispatchContactsUpdated();
    return true;
  } catch (error) {
    // Mark as error but keep locally
    const db = await getDB();
    contact.syncStatus = "error";
    contact.syncError = error instanceof Error ? error.message : "Sync failed";
    contact.updatedAt = Date.now();
    await db.put("contacts", contact);

    dispatchContactsUpdated();
    return false;
  } finally {
    syncingContactIds.delete(contact.id);
  }
}

const SYNC_CONCURRENCY = 5;

async function runWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;
  async function worker(): Promise<void> {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

// ─── Sync All Pending Contacts ───────────────────────────────────
export async function syncAllPendingContacts(): Promise<{
  synced: number;
  failed: number;
}> {
  const pending = await getPendingContacts();
  const db = await getDB();
  const errorContacts: ContactFormData[] = await db.getAllFromIndex(
    "contacts",
    "syncStatus",
    "error"
  );
  errorContacts.forEach((c) => (c.syncStatus = "pending"));
  const toSync = [...pending, ...errorContacts];

  if (toSync.length === 0) return { synced: 0, failed: 0 };

  const outcomes = await runWithConcurrency(
    toSync,
    (contact) => syncContactToPayload(contact),
    SYNC_CONCURRENCY
  );
  const synced = outcomes.filter(Boolean).length;
  const failed = outcomes.length - synced;
  return { synced, failed };
}

// ─── Deduplicate existing contacts (merge by email or phone) ──────
export async function deduplicateAllContacts(): Promise<{ merged: number }> {
  const db = await getDB();
  const all: ContactFormData[] = await db.getAll("contacts");
  const byKey = new Map<string, ContactFormData[]>();

  for (const c of all) {
    const emailNorm = normalizeEmail(c.email);
    const phoneNorm = normalizePhone(c.contactNo);
    const key = emailNorm || phoneNorm || `id:${c.id}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(c);
  }

  let merged = 0;
  for (const [, group] of byKey) {
    if (group.length <= 1) continue;
    group.sort((a, b) => a.createdAt - b.createdAt);
    const keep = group[0];
    const rest = group.slice(1);
    const mergedNotes = [keep.notes, ...rest.map((r) => r.notes)].filter(Boolean).join("\n---\n");
    const mergedContact: ContactFormData = {
      ...keep,
      name: keep.name || rest.find((r) => r.name)?.name || "Unknown",
      companyName: keep.companyName || rest.find((r) => r.companyName)?.companyName,
      contactNo: keep.contactNo || rest.find((r) => r.contactNo)?.contactNo || "",
      email: keep.email || rest.find((r) => r.email)?.email || "",
      notes: mergedNotes,
      photo: keep.photo || rest.find((r) => r.photo)?.photo,
      voiceNote: keep.voiceNote || rest.find((r) => r.voiceNote)?.voiceNote,
      voiceNoteTranscript: keep.voiceNoteTranscript || rest.find((r) => r.voiceNoteTranscript)?.voiceNoteTranscript,
      followUpTags: keep.followUpTags?.length ? keep.followUpTags : rest.find((r) => r.followUpTags?.length)?.followUpTags,
      syncStatus: keep.syncStatus === "synced" ? "synced" : "pending",
      updatedAt: Date.now(),
    };
    await db.put("contacts", mergedContact);
    for (const r of rest) await db.delete("contacts", r.id);
    merged += rest.length;
  }
  if (merged > 0) dispatchContactsUpdated();
  return { merged };
}

// ─── Delete Contact ──────────────────────────────────────────────
export async function deleteContact(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("contacts", id);
  dispatchContactsUpdated();
}

// ─── Network Status Helpers ──────────────────────────────────────
export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

// ─── Event Dispatcher ────────────────────────────────────────────
function dispatchContactsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("contactsUpdated"));
  }
}