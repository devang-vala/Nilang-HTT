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

  const tagBadgeClass = (tag: string) => {
    switch (tag) {
      case "hot":
        return "bg-foreground text-background";
      case "warm":
        return "bg-muted-foreground/20 text-foreground";
      case "cold":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const syncIcon = (status: string) => {
    switch (status) {
      case "synced":
        return <Cloud className="h-3.5 w-3.5 text-foreground/40" />;
      case "error":
        return <AlertTriangle className="h-3.5 w-3.5 text-destructive" />;
      default:
        return <CloudOff className="h-3.5 w-3.5 text-muted-foreground/40" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl text-xs gap-2 border-border text-foreground hover:bg-muted"
          onClick={() => loadContacts()}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl">
        {(["all", "stall", "field"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all capitalize
              ${
                filter === f
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
          >
            {f === "all" ? (
              <span className="flex items-center justify-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                All ({contacts.length})
              </span>
            ) : f === "stall" ? (
              <span className="flex items-center justify-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                Stall ({contacts.filter((c) => c.captureMode === "stall").length})
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                Field ({contacts.filter((c) => c.captureMode === "field").length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
        <input
          type="search"
          placeholder="Search contacts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-11 py-3 text-sm bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/20 transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Tag filter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5" />
            Filter by tag
          </span>
          {selectedTags.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedTags([])}
              className="text-xs font-medium text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              Clear
            </button>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium bg-muted/50 border border-border text-foreground hover:bg-muted transition-all w-full sm:w-auto justify-between"
            >
              <span>
                {selectedTags.length === 0
                  ? "All tags"
                  : selectedTags.length === 1
                    ? tagLabel(selectedTags[0])
                    : `${selectedTags.length} tags selected`}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 max-h-[70vh] overflow-y-auto rounded-xl">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Select one or more tags
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
                  <span className="text-xs text-muted-foreground tabular-nums">({count})</span>
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">No contacts found</p>
          <p className="text-xs text-muted-foreground">
            {contacts.length === 0
              ? "Start capturing leads to see them here"
              : "Try adjusting your filters"}
          </p>
        </div>
      )}

      {/* Contact Cards */}
      <div className="space-y-3">
        {filtered.map((contact) => (
          <div
            key={contact.source === "server" ? `s-${contact.id}` : contact.id}
            className="bg-card border border-border rounded-xl p-4 hover:border-foreground/10 transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-foreground text-background rounded-full flex items-center justify-center text-xs font-semibold">
                  {(contact.name || "?")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {contact.name || "--"}
                  </h3>
                  {contact.companyName && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {contact.companyName}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${tagBadgeClass(contact.tags)}`}>
                  {contact.tags ? contact.tags.toUpperCase() : "WARM"}
                </span>
                {syncIcon(contact.syncStatus)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-3">
              <div className="flex items-center gap-1.5">
                <Phone className="h-3 w-3 shrink-0" />
                <span className="truncate">{contact.contactNo || "--"}</span>
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate">{contact.email || "--"}</span>
              </div>
            </div>

            {contact.notes && (
              <p className="text-xs text-muted-foreground bg-muted p-3 rounded-lg mb-3 line-clamp-2">
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
                className="w-full text-left mb-3 rounded-xl bg-muted border border-border p-3 hover:border-foreground/10 transition-all cursor-pointer"
              >
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <Mic className="h-3 w-3" /> Voice note
                </p>
                <p className="text-xs text-foreground line-clamp-2 leading-relaxed">
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
                      className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-foreground text-background"
                    >
                      {label}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Actions */}
            {(contact.followUpTags?.length && (contact.contactNo || contact.email)) ? (
              <div className="flex flex-wrap gap-2 mb-3">
                {contact.contactNo && (
                  <a
                    href={`tel:${contact.contactNo.replace(/\s/g, "")}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-foreground text-background hover:bg-foreground/90 transition-colors"
                  >
                    <Phone className="h-3 w-3" />
                    Call
                  </a>
                )}
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-foreground hover:bg-muted-foreground/10 transition-colors"
                  >
                    <Mail className="h-3 w-3" />
                    Email
                  </a>
                )}
              </div>
            ) : null}

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground`}>
                  {contact.captureMode === "stall" ? "Stall" : "Field"}
                </span>
                {contact.source === "server" && (
                  <span className="text-[10px] text-muted-foreground">Server</span>
                )}
                <span className="text-[10px] text-muted-foreground">
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
                  className="p-1.5 text-muted-foreground/40 hover:text-destructive rounded-lg transition-colors disabled:opacity-50 disabled:pointer-events-none"
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
      </div>

      {/* Voice note modal */}
      {voiceNoteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/50"
          onClick={() => setVoiceNoteModal(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="voice-note-modal-title"
        >
          <div
            className="bg-card rounded-2xl shadow-xl max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 id="voice-note-modal-title" className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Mic className="h-4 w-4" />
                {voiceNoteModal.contactName}
              </h2>
              <button
                type="button"
                onClick={() => setVoiceNoteModal(null)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Voice Note
              </p>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {voiceNoteModal.transcript || "(No transcript)"}
              </p>
            </div>
            <div className="p-4 border-t border-border">
              <button
                onClick={() => setVoiceNoteModal(null)}
                className="w-full py-2.5 bg-foreground text-background text-sm font-medium rounded-xl hover:bg-foreground/90 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
