"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getMergedContactsForDisplay,
  deleteContact,
  type MergedContact,
} from "@/lib/contactService";
import { formatTranscriptForDisplay } from "@/lib/formatTranscriptForDisplay";
import {
  FOLLOW_UP_TAG_VALUES,
  FOLLOW_UP_TAG_LABELS,
  type FollowUpTagValue,
} from "@/lib/followUpTags";
import {
  User,
  Building2,
  Phone,
  Mail,
  Cloud,
  CloudOff,
  AlertTriangle,
  Trash2,
  MapPin,
  Users,
  RefreshCw,
  Mic,
  Search,
  Tag,
  X,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface ContactListProps {
  isActive?: boolean;
}

export default function ContactList({ isActive = true }: ContactListProps) {
  const [contacts, setContacts] = useState<MergedContact[]>([]);
  const [filter, setFilter] = useState<"all" | "stall" | "field">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [voiceNoteModal, setVoiceNoteModal] = useState<{
    transcript: string;
    raw: string;
    contactName: string;
  } | null>(null);

  const loadContacts = useCallback(async () => {
    try {
      const merged = await getMergedContactsForDisplay();
      setContacts(merged);
    } catch (err) {
      console.error("Failed to load contacts:", err);
    }
  }, []);

  useEffect(() => {
    loadContacts();
    const handler = () => loadContacts();
    window.addEventListener("contactsUpdated", handler);
    const interval = setInterval(loadContacts, 10_000);
    return () => {
      window.removeEventListener("contactsUpdated", handler);
      clearInterval(interval);
    };
  }, [loadContacts]);

  // Refetch when user switches to this tab so list is always up to date
  useEffect(() => {
    if (isActive) loadContacts();
  }, [isActive, loadContacts]);

  const byMode =
    filter === "all"
      ? contacts
      : contacts.filter((c) => c.captureMode === filter);

  const bySearch = searchQuery.trim()
    ? byMode.filter((c) => {
        const q = searchQuery.trim().toLowerCase();
        const name = (c.name || "").toLowerCase();
        const email = (c.email || "").toLowerCase();
        const company = (c.companyName || "").toLowerCase();
        const phone = (c.contactNo || "").replace(/\D/g, "");
        const qDigits = q.replace(/\D/g, "");
        return (
          name.includes(q) ||
          email.includes(q) ||
          company.includes(q) ||
          (qDigits.length >= 4 && phone.includes(qDigits))
        );
      })
    : byMode;

  const filtered =
    selectedTags.length === 0
      ? bySearch
      : bySearch.filter((c) =>
          c.followUpTags?.some((t) => {
            const v = typeof t === "string" ? t : t.value;
            return selectedTags.includes(v);
          })
        );

  const { tagCounts, tagValueToLabel } = contacts.reduce<{
    tagCounts: Record<string, number>;
    tagValueToLabel: Record<string, string>;
  }>(
    (acc, c) => {
      (c.followUpTags ?? []).forEach((t) => {
        const v = typeof t === "string" ? t : t.value;
        acc.tagCounts[v] = (acc.tagCounts[v] ?? 0) + 1;
        if (!acc.tagValueToLabel[v])
          acc.tagValueToLabel[v] =
            typeof t === "string"
              ? t.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase())
              : t.label;
      });
      return acc;
    },
    { tagCounts: {}, tagValueToLabel: {} }
  );
  // Show all follow-up tag types in filter with counts (0 if none)
  const uniqueTagValues = [...FOLLOW_UP_TAG_VALUES];
  const tagLabel = (value: string) =>
    FOLLOW_UP_TAG_LABELS[value as FollowUpTagValue] ?? tagValueToLabel[value] ?? value.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());

  const handleDelete = async (contact: MergedContact) => {
    if (contact.source === "server") return;
    if (!confirm("Delete this contact?")) return;
    setDeletingId(contact.id);
    try {
      await deleteContact(contact.id);
      setContacts((prev) => prev.filter((c) => c.id !== contact.id || c.source !== "local"));
      await loadContacts();
    } finally {
      setDeletingId(null);
    }
  };

  const tagBadge = (tag: string) => {
    switch (tag) {
      case "hot":
        return "bg-red-50 text-red-700 border-red-200";
      case "warm":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "cold":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  const syncIcon = (status: string) => {
    switch (status) {
      case "synced":
        return <Cloud className="h-3.5 w-3.5 text-emerald-500" />;
      case "error":
        return <AlertTriangle className="h-3.5 w-3.5 text-red-500" />;
      default:
        return <CloudOff className="h-3.5 w-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar: Refresh only */}
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-lg text-xs gap-1.5 border-slate-200 text-slate-600 hover:bg-slate-50"
          onClick={() => loadContacts()}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-md">
        {(["all", "stall", "field"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all capitalize
              ${
                filter === f
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
          >
            {f === "all" ? (
              <span className="flex items-center justify-center gap-1">
                <Users className="h-3.5 w-3.5" />
                All ({contacts.length})
              </span>
            ) : f === "stall" ? (
              <span className="flex items-center justify-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                Stall ({contacts.filter((c) => c.captureMode === "stall").length})
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1">
                <User className="h-3.5 w-3.5" />
                Field ({contacts.filter((c) => c.captureMode === "field").length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search — no overlap with icon, clear hierarchy */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none shrink-0" />
        <input
          type="search"
          placeholder="Search contacts…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-11 py-3 text-sm bg-white border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-300 transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Tag filter — multi-select dropdown */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5" />
            Filter by tag
          </span>
          {selectedTags.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedTags([])}
              className="text-xs font-medium text-slate-500 hover:text-slate-700 underline underline-offset-2"
            >
              Clear filter
            </button>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all w-full sm:w-auto justify-between"
            >
              <span>
                {selectedTags.length === 0
                  ? "All tags"
                  : selectedTags.length === 1
                    ? tagLabel(selectedTags[0])
                    : `${selectedTags.length} tags selected`}
              </span>
              <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 max-h-[70vh] overflow-y-auto">
            <DropdownMenuLabel className="text-xs text-slate-500">
              Select one or more tags (contacts matching any)
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {uniqueTagValues.map((value) => {
              const label = tagLabel(value);
              const count = tagCounts[value] ?? 0;
              const checked = selectedTags.includes(value);
              return (
                <DropdownMenuCheckboxItem
                  key={value}
                  checked={checked}
                  onSelect={(e) => {
                    e.preventDefault();
                    setSelectedTags((prev) =>
                      prev.includes(value)
                        ? prev.filter((t) => t !== value)
                        : [...prev, value]
                    );
                  }}
                >
                  <span className="flex-1">{label}</span>
                  <span className="text-xs text-slate-400 tabular-nums">({count})</span>
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            {contacts.length === 0
              ? "No contacts captured yet"
              : "No contacts match the current filters"}
          </p>
        </div>
      )}

      {/* Contact Cards */}
      {filtered.map((contact) => (
        <div
          key={contact.source === "server" ? `s-${contact.id}` : contact.id}
          className="bg-white border border-slate-100 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                {(contact.name || "?")
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {contact.name || "—"}
                </h3>
                {contact.companyName && (
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {contact.companyName}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${tagBadge(
                  contact.tags
                )}`}
              >
                {contact.tags === "hot"
                  ? "🔥 Hot"
                  : contact.tags === "warm"
                  ? "🌡️ Warm"
                  : "❄️ Cold"}
              </span>
              {syncIcon(contact.syncStatus)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mb-3">
            <div className="flex items-center gap-1.5">
              <Phone className="h-3 w-3 text-slate-400 shrink-0" />
              <span className="truncate">{contact.contactNo || "—"}</span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <Mail className="h-3 w-3 text-slate-400 shrink-0" />
              <span className="truncate">{contact.email || "—"}</span>
            </div>
          </div>

          {contact.notes && (
            <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg mb-3 line-clamp-2">
              {contact.notes}
            </p>
          )}

          {(contact.voiceNoteTranscript || contact.audioTranscript) && (
            <button
              type="button"
              onClick={() => {
                const raw = contact.voiceNoteTranscript || contact.audioTranscript || "";
                setVoiceNoteModal({
                  transcript: formatTranscriptForDisplay(raw),
                  raw,
                  contactName: contact.name || "Contact",
                });
              }}
              className="w-full text-left mb-3 rounded-xl bg-slate-50 border border-slate-200/60 p-3 shadow-sm hover:border-slate-300 hover:shadow-md transition-all cursor-pointer"
            >
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Mic className="h-3.5 w-3.5 text-slate-600" /> Short note
                <span className="text-slate-400 font-normal normal-case ml-1">— tap to open</span>
              </p>
              <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed line-clamp-2">
                {formatTranscriptForDisplay(
                  contact.voiceNoteTranscript || contact.audioTranscript
                ) || "(No transcript)"}
              </p>
            </button>
          )}

          {contact.followUpTags && contact.followUpTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {contact.followUpTags.map((tag, i) => {
                const value = typeof tag === "string" ? tag : tag.value;
                const label = tagLabel(value);
                return (
                  <span
                    key={value + i}
                    className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-slate-800 text-white"
                  >
                    {label}
                  </span>
                );
              })}
            </div>
          )}

          {/* Direct actions for follow-ups: Call, Email */}
          {(contact.followUpTags?.length && (contact.contactNo || contact.email)) ? (
            <div className="flex flex-wrap gap-2 mb-3">
              {contact.contactNo && (
                <a
                  href={`tel:${contact.contactNo.replace(/\s/g, "")}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                >
                  <Phone className="h-3.5 w-3.5" />
                  Call
                </a>
              )}
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700 text-white hover:bg-slate-800 transition-colors"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </a>
              )}
            </div>
          ) : null}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium
                ${
                  contact.captureMode === "stall"
                    ? "bg-indigo-50 text-indigo-600"
                    : "bg-teal-50 text-teal-600"
                }`}
              >
                {contact.captureMode === "stall" ? "Stall" : "Field"}
              </span>
              {contact.source === "server" && (
                <span className="text-[10px] text-slate-400">Server</span>
              )}
              <span className="text-[10px] text-slate-400">
                {new Date(contact.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            {contact.source === "local" ? (
              <button
                type="button"
                onClick={() => handleDelete(contact)}
                disabled={deletingId === contact.id}
                className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg transition-colors disabled:opacity-50 disabled:pointer-events-none"
                aria-label="Delete contact"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ) : (
              <span className="w-8" />
            )}
          </div>
        </div>
      ))}

      {/* Short note modal — key points + full transcript (visible on click) */}
      {voiceNoteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setVoiceNoteModal(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="voice-note-modal-title"
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h2 id="voice-note-modal-title" className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Mic className="h-4 w-4 text-slate-600" />
                Short note — {voiceNoteModal.contactName}
              </h2>
              <button
                type="button"
                onClick={() => setVoiceNoteModal(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Short note
              </p>
              <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                {voiceNoteModal.transcript || "(No transcript)"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}