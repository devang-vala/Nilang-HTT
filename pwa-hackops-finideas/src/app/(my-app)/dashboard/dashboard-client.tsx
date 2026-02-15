"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useCurrentUser } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { 
  MapPin, 
  FileText, 
  QrCode as QrCodeIcon, 
  Phone, 
  Copy, 
  CheckCircle2,
  X,
  Mail,
  Video,
  Filter,
  Users,
  UserCheck
} from "lucide-react"

interface Meeting {
  meetLink: string
  scheduledAt: string
  status: string
}

interface EmailSent {
  subject: string
  template: string
  sentAt: string
  status: string
}

interface Lead {
  id: string
  name: string
  companyName: string | null
  email: string
  contactNo: string
  tags: "hot" | "warm" | "cold"
  followUpStatus: string
  voiceNoteSummary: string | null
  voiceNoteTranscript?: string | null
  followUpTags?: string[]
  locationName?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  emailsSent: EmailSent[]
  meetings: Meeting[]
  createdAt: string
  qrData?: string | null
  createdById?: string | null
  createdByName?: string | null
}

function fullAddress(lead: Lead): string {
  const parts = [
    lead.locationName,
    [lead.city, lead.state, lead.country].filter(Boolean).join(", "),
  ].filter(Boolean)
  return parts.join(" - ") || "--"
}

function extractPhoneNumbers(text: string): string[] {
  const phoneRegex = /(?:(?:\+|00)?91[\s.-]?)?(?:\(?\d{3,5}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}/g
  const matches = text.match(phoneRegex) || []
  return [...new Set(matches.map(m => m.trim()))]
}

interface Agent {
  id: string
  name: string | null
}

interface Stats {
  total: number
  hot: number
  warm: number
  cold: number
  pending: number
  emailSent: number
  meetingScheduled: number
  converted: number
}

function InfoModal({ 
  title, 
  content, 
  onClose,
  type,
  emailHistory
}: { 
  title: string
  content: string | null
  onClose: () => void
  type: 'transcript' | 'location' | 'qrData' | 'emailHistory'
  emailHistory?: EmailSent[]
}) {
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null)
  const [copiedQr, setCopiedQr] = useState(false)

  const phoneNumbers = type === 'transcript' && content ? extractPhoneNumbers(content) : []

  const copyToClipboard = (text: string, isPhone = false) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
      if (isPhone) {
        setCopiedPhone(text)
        setTimeout(() => setCopiedPhone(null), 2000)
      } else {
        setCopiedQr(true)
        setTimeout(() => setCopiedQr(false), 2000)
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-foreground/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden border border-border" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-foreground flex items-center justify-center">
              {type === 'transcript' && <FileText className="h-4 w-4 text-background" />}
              {type === 'location' && <MapPin className="h-4 w-4 text-background" />}
              {type === 'qrData' && <QrCodeIcon className="h-4 w-4 text-background" />}
              {type === 'emailHistory' && <Mail className="h-4 w-4 text-background" />}
            </div>
            <h3 className="font-semibold text-foreground">{title}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto max-h-[calc(80vh-140px)]">
          {type === 'emailHistory' ? (
            emailHistory && emailHistory.length > 0 ? (
              <div className="space-y-3">
                {emailHistory.map((email, idx) => (
                  <div key={idx} className="p-4 bg-muted border border-border rounded-xl">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-foreground text-sm mb-1">{email.subject}</p>
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-foreground text-background">
                            {email.template.includes('followup') || email.template.includes('follow') ? 'Follow-up' : 'Initial'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Template: {email.template}
                          </span>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        email.status === 'sent'
                          ? 'bg-foreground text-background'
                          : 'bg-destructive/10 text-destructive'
                      }`}>
                        {email.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Sent: {new Date(email.sentAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No emails sent yet</p>
            )
          ) : !content ? (
            <p className="text-muted-foreground text-center py-8">No data available</p>
          ) : (
            <>
              {type === 'transcript' && phoneNumbers.length > 0 && (
                <div className="mb-4 p-4 bg-muted border border-border rounded-xl">
                  <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    Detected Phone Numbers
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {phoneNumbers.map((phone, idx) => (
                      <button
                        key={idx}
                        onClick={() => copyToClipboard(phone, true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-lg hover:bg-muted transition-colors group"
                      >
                        <span className="text-sm font-mono text-foreground">{phone}</span>
                        {copiedPhone === phone ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-foreground" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {type === 'qrData' && (
                <div className="mb-4">
                  <button
                    onClick={() => copyToClipboard(content)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-muted border border-border rounded-xl hover:border-foreground/20 transition-colors group"
                  >
                    <span className="text-sm text-foreground break-all text-left">{content}</span>
                    {copiedQr ? (
                      <CheckCircle2 className="h-4 w-4 text-foreground shrink-0" />
                    ) : (
                      <Copy className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                    )}
                  </button>
                </div>
              )}

              <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-muted p-4 rounded-xl border border-border">
                {content}
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-border">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-foreground text-background text-sm font-medium rounded-xl hover:bg-foreground/90 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [filterByAgentId, setFilterByAgentId] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<'initial' | 'followup'>('initial')
  const [loading, setLoading] = useState(true)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [showMeetModal, setShowMeetModal] = useState(false)
  const [infoModal, setInfoModal] = useState<{
    show: boolean
    title: string
    content: string | null
    type: 'transcript' | 'location' | 'qrData' | 'emailHistory'
    emailHistory?: EmailSent[]
  } | null>(null)
  const { data: user, isLoading: userLoading } = useCurrentUser()
  const router = useRouter()

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/auth')
    }
  }, [user, userLoading, router])

  const isAdmin = user?.role === 'admin'

  const fetchData = async () => {
    try {
      const res = await fetch("/api/dashboard")
      const json = await res.json()
      if (json.success && json.data) {
        setLeads(json.data.leads || [])
        setStats(json.data.stats || null)
        setAgents(json.data.agents || [])
      }
    } catch (err) {
      console.error("Failed to fetch dashboard:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const getTagStyle = (tag: string | undefined | null) => {
    if (tag === "hot") return "bg-foreground text-background"
    if (tag === "warm") return "bg-muted-foreground/20 text-foreground"
    return "bg-muted text-muted-foreground"
  }

  const getStatusStyle = (status: string | undefined | null) => {
    if (status === "email_sent") return "bg-foreground/10 text-foreground border border-foreground/20"
    if (status === "meeting_scheduled") return "bg-foreground/10 text-foreground border border-foreground/20"
    if (status === "converted") return "bg-foreground text-background"
    return "bg-muted text-muted-foreground border border-border"
  }

  const openEmailModal = (lead: Lead) => { setSelectedLead(lead); setShowEmailModal(true) }
  const openMeetModal = (lead: Lead) => { setSelectedLead(lead); setShowMeetModal(true) }
  const closeEmailModal = () => { setShowEmailModal(false); setSelectedLead(null) }
  const closeMeetModal = () => { setShowMeetModal(false); setSelectedLead(null) }
  const handleEmailSuccess = () => { closeEmailModal(); fetchData() }
  const handleMeetSuccess = () => { closeMeetModal(); fetchData() }

  const hasBeenEmailed = (lead: Lead): boolean => {
    return Array.isArray(lead.emailsSent) && lead.emailsSent.length > 0
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-foreground border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const filteredLeads = filterByAgentId
      ? leads.filter((l) => (l.createdById ?? null) === filterByAgentId)
      : leads

  const initialLeads = filteredLeads.filter(lead => !hasBeenEmailed(lead))
  const followUpLeads = filteredLeads.filter(lead => hasBeenEmailed(lead))
  const currentSectionLeads = activeSection === 'initial' ? initialLeads : followUpLeads

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Lead Dashboard
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {isAdmin ? `Admin View -- ${initialLeads.length} initial, ${followUpLeads.length} follow-up` : `Welcome back, ${user?.name || 'User'}`}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {isAdmin && agents.length > 0 && (
                <div className="flex items-center gap-2 bg-card rounded-xl border border-border px-4 py-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <select
                    value={filterByAgentId ?? ''}
                    onChange={(e) => setFilterByAgentId(e.target.value || null)}
                    className="text-sm text-foreground bg-transparent border-none outline-none cursor-pointer"
                  >
                    <option value="">All agents</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name || `Agent ${a.id.slice(0, 8)}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {isAdmin && (
                <Link
                  href="/admin"
                  className="px-4 py-2 bg-foreground text-background text-sm font-medium rounded-xl hover:bg-foreground/90 transition-all"
                >
                  Admin Panel
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <div className="bg-card p-5 rounded-xl border border-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Leads</p>
              <p className="text-3xl font-bold text-foreground">{stats.total || 0}</p>
            </div>
            <div className="bg-foreground p-5 rounded-xl">
              <p className="text-xs font-medium text-background/60 uppercase tracking-wider mb-1">Hot</p>
              <p className="text-3xl font-bold text-background">{stats.hot || 0}</p>
            </div>
            <div className="bg-card p-5 rounded-xl border border-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Warm</p>
              <p className="text-3xl font-bold text-foreground">{stats.warm || 0}</p>
            </div>
            <div className="bg-card p-5 rounded-xl border border-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Cold</p>
              <p className="text-3xl font-bold text-foreground">{stats.cold || 0}</p>
            </div>
          </div>
        )}

        {/* Section Tabs */}
        <div className="mb-6">
          <div className="bg-muted rounded-xl p-1 inline-flex gap-1">
            <button
              onClick={() => setActiveSection('initial')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${
                activeSection === 'initial'
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Initial</span>
              <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                activeSection === 'initial'
                  ? 'bg-background/20 text-background'
                  : 'bg-border text-muted-foreground'
              }`}>
                {initialLeads.length}
              </span>
            </button>
            <button
              onClick={() => setActiveSection('followup')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${
                activeSection === 'followup'
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <UserCheck className="h-4 w-4" />
              <span>Follow-up</span>
              <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                activeSection === 'followup'
                  ? 'bg-background/20 text-background'
                  : 'bg-border text-muted-foreground'
              }`}>
                {followUpLeads.length}
              </span>
            </button>
          </div>
        </div>

        {/* Leads Table */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Lead Info
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Contact
                  </th>
                  {isAdmin && (
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Agent
                    </th>
                  )}
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-4 py-3.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {currentSectionLeads.length > 0 ? (
                  currentSectionLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-foreground flex items-center justify-center text-background font-semibold text-sm">
                            {(lead.name || 'U')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground text-sm">{lead.name || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">{lead.companyName || "--"}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <p className="text-sm text-foreground">{lead.email || "--"}</p>
                          <p className="text-xs text-muted-foreground">{lead.contactNo || "--"}</p>
                          {lead.emailsSent && lead.emailsSent.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <Mail className="h-3 w-3 text-foreground/50" />
                              <span className="text-xs text-muted-foreground font-medium">
                                {lead.emailsSent.length} email{lead.emailsSent.length > 1 ? 's' : ''} sent
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {isAdmin && (
                        <td className="px-4 py-4">
                          {lead.createdByName ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-foreground">
                              {lead.createdByName}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">--</span>
                          )}
                        </td>
                      )}

                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getTagStyle(lead.tags)}`}>
                          {lead.tags ? lead.tags.toUpperCase() : "N/A"}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusStyle(lead.followUpStatus)}`}>
                          {(lead.followUpStatus || "pending").replace(/_/g, " ")}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setInfoModal({
                              show: true,
                              title: `${lead.name}'s Transcript`,
                              content: lead.voiceNoteTranscript || null,
                              type: 'transcript'
                            })}
                            disabled={!lead.voiceNoteTranscript}
                            className={`p-2 rounded-xl transition-all ${
                              lead.voiceNoteTranscript
                                ? 'bg-muted text-foreground hover:bg-foreground hover:text-background'
                                : 'bg-muted text-muted-foreground/30 cursor-not-allowed'
                            }`}
                            title={lead.voiceNoteTranscript ? "View transcript" : "No transcript"}
                          >
                            <FileText className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => setInfoModal({
                              show: true,
                              title: `${lead.name}'s Location`,
                              content: fullAddress(lead) !== "--" ? fullAddress(lead) : null,
                              type: 'location'
                            })}
                            disabled={fullAddress(lead) === "--"}
                            className={`p-2 rounded-xl transition-all ${
                              fullAddress(lead) !== "--"
                                ? 'bg-muted text-foreground hover:bg-foreground hover:text-background'
                                : 'bg-muted text-muted-foreground/30 cursor-not-allowed'
                            }`}
                            title={fullAddress(lead) !== "--" ? "View location" : "No location"}
                          >
                            <MapPin className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => setInfoModal({
                              show: true,
                              title: `${lead.name}'s QR Data`,
                              content: lead.qrData || null,
                              type: 'qrData'
                            })}
                            disabled={!lead.qrData}
                            className={`p-2 rounded-xl transition-all ${
                              lead.qrData
                                ? 'bg-muted text-foreground hover:bg-foreground hover:text-background'
                                : 'bg-muted text-muted-foreground/30 cursor-not-allowed'
                            }`}
                            title={lead.qrData ? "View QR data" : "No QR data"}
                          >
                            <QrCodeIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEmailModal(lead)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground text-background text-xs font-medium rounded-xl hover:bg-foreground/90 transition-all"
                          >
                            <Mail className="h-3.5 w-3.5" />
                            Email
                          </button>
                          <button
                            onClick={() => openMeetModal(lead)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-foreground text-xs font-medium rounded-xl hover:bg-muted-foreground/10 transition-all border border-border"
                          >
                            <Video className="h-3.5 w-3.5" />
                            Meet
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                          {activeSection === 'initial' ? (
                            <Users className="h-6 w-6 text-muted-foreground" />
                          ) : (
                            <UserCheck className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <p className="text-foreground font-medium text-sm">
                          {activeSection === 'initial' 
                            ? 'No initial contacts found' 
                            : 'No follow-up leads yet'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activeSection === 'initial'
                            ? 'New leads will appear here first'
                            : 'Leads move here after sending a follow-up email'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {infoModal?.show && (
        <InfoModal
          title={infoModal.title}
          content={infoModal.content}
          type={infoModal.type}
          onClose={() => setInfoModal(null)}
        />
      )}

      {showEmailModal && selectedLead && (
        <EmailModal
          lead={selectedLead}
          onClose={closeEmailModal}
          onSuccess={handleEmailSuccess}
        />
      )}

      {showMeetModal && selectedLead && (
        <MeetModal
          lead={selectedLead}
          onClose={closeMeetModal}
          onSuccess={handleMeetSuccess}
        />
      )}
    </div>
  )
}

function EmailModal({
  lead,
  onClose,
  onSuccess,
}: {
  lead: Lead
  onClose: () => void
  onSuccess: () => void
}) {
  const [emailType, setEmailType] = useState<"initial" | "followup">("initial")
  const [loading, setLoading] = useState(false)

  if (!lead) return null

  const sendEmail = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/leads/${lead.id}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: emailType }),
      })
      const json = await res.json()
      alert(json.message || "Email sent!")
      if (json.success) onSuccess()
    } catch (error) {
      console.error(error)
      alert("Failed to send email")
    } finally {
      setLoading(false)
    }
  }

  const leadTags = lead.tags || "warm"

  return (
    <div className="fixed inset-0 bg-foreground/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-md border border-border" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center">
              <Mail className="h-5 w-5 text-background" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Send Email</h2>
              <p className="text-sm text-muted-foreground">To {lead.name || "Lead"}</p>
            </div>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground mb-3">Email Type</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setEmailType("initial")}
                className={`p-4 rounded-xl border-2 transition-all text-center ${
                  emailType === "initial"
                    ? "border-foreground bg-muted"
                    : "border-border hover:border-foreground/20"
                }`}
              >
                <span className="text-sm font-medium text-foreground">Initial</span>
              </button>
              <button
                type="button"
                onClick={() => setEmailType("followup")}
                className={`p-4 rounded-xl border-2 transition-all text-center ${
                  emailType === "followup"
                    ? "border-foreground bg-muted"
                    : "border-border hover:border-foreground/20"
                }`}
              >
                <span className="text-sm font-medium text-foreground">Follow Up</span>
              </button>
            </div>
          </div>
          <div className="p-3 bg-muted rounded-xl border border-border">
            <p className="text-xs text-muted-foreground">
              Template priority: <span className="font-semibold text-foreground">{leadTags.toUpperCase()}</span>
            </p>
          </div>
        </div>
        <div className="p-5 border-t border-border flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-muted border border-border text-foreground rounded-xl hover:bg-muted-foreground/10 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={sendEmail}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-foreground text-background rounded-xl hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? "Sending..." : "Send Email"}
          </button>
        </div>
      </div>
    </div>
  )
}

function MeetModal({
  lead,
  onClose,
  onSuccess,
}: {
  lead: Lead
  onClose: () => void
  onSuccess: () => void
}) {
  const [meetType, setMeetType] = useState<"instant" | "schedule">("instant")
  const [scheduleDate, setScheduleDate] = useState("")
  const [duration, setDuration] = useState(30)
  const [loading, setLoading] = useState(false)
  const [meetingData, setMeetingData] = useState<{
    hostLink: string
    guestLink: string
  } | null>(null)

  if (!lead) return null

  const createMeeting = async () => {
    if (meetType === "schedule" && !scheduleDate) {
      alert("Please select date and time")
      return
    }

    setLoading(true)
    try {
      const body = meetType === "instant"
        ? { instant: true }
        : { scheduledAt: new Date(scheduleDate).toISOString(), duration }

      const res = await fetch(`/api/leads/${lead.id}/create-meeting`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()

      if (json.success && json.data) {
        setMeetingData({
          hostLink: json.data.hostLink || "",
          guestLink: json.data.guestLink || "",
        })
        if (meetType === "instant" && json.data.hostLink) {
          window.open(json.data.hostLink, "_blank")
        }
      } else {
        alert(json.message || "Failed to create meeting")
      }
    } catch (error) {
      console.error(error)
      alert("Failed to create meeting")
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text)
      alert("Copied to clipboard!")
    }
  }

  if (meetingData) {
    return (
      <div className="fixed inset-0 bg-foreground/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onSuccess}>
        <div className="bg-card rounded-2xl shadow-xl w-full max-w-md border border-border" onClick={(e) => e.stopPropagation()}>
          <div className="p-5 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-background" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">Meeting Created!</h2>
                <p className="text-sm text-muted-foreground">Invite sent to {lead.email || "lead"}</p>
              </div>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div className="bg-muted p-4 rounded-xl border border-border">
              <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Video className="h-3.5 w-3.5" />
                Your Host Link
              </p>
              <div className="flex gap-2">
                <input
                  value={meetingData.hostLink}
                  readOnly
                  className="flex-1 text-xs bg-card border border-border rounded-lg px-3 py-2 text-foreground"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(meetingData.hostLink)}
                  className="px-3 bg-muted hover:bg-muted-foreground/10 rounded-lg transition-colors border border-border"
                  title="Copy"
                >
                  <Copy className="h-4 w-4 text-foreground" />
                </button>
              </div>
            </div>
            <div className="bg-muted p-4 rounded-xl border border-border">
              <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                Guest Link (sent to {lead.name || "guest"})
              </p>
              <div className="flex gap-2">
                <input
                  value={meetingData.guestLink}
                  readOnly
                  className="flex-1 text-xs bg-card border border-border rounded-lg px-3 py-2 text-foreground"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(meetingData.guestLink)}
                  className="px-3 bg-muted hover:bg-muted-foreground/10 rounded-lg transition-colors border border-border"
                  title="Copy"
                >
                  <Copy className="h-4 w-4 text-foreground" />
                </button>
              </div>
            </div>
          </div>
          <div className="p-5 border-t border-border flex gap-3">
            <button
              type="button"
              onClick={onSuccess}
              className="flex-1 px-4 py-2.5 bg-muted border border-border text-foreground rounded-xl hover:bg-muted-foreground/10 transition-colors font-medium"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                if (meetingData.hostLink) {
                  window.open(meetingData.hostLink, "_blank")
                }
              }}
              className="flex-1 px-4 py-2.5 bg-foreground text-background rounded-xl hover:bg-foreground/90 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Video className="h-4 w-4" />
              Start Meeting
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-foreground/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-md border border-border" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center">
              <Video className="h-5 w-5 text-background" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Create Meeting</h2>
              <p className="text-sm text-muted-foreground">With {lead.name || "Lead"}</p>
            </div>
          </div>
        </div>
        <div className="p-5 space-y-5">
          <div>
            <p className="text-sm font-medium text-foreground mb-3">Meeting Type</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMeetType("instant")}
                className={`p-4 rounded-xl border-2 transition-all text-center ${
                  meetType === "instant"
                    ? "border-foreground bg-muted"
                    : "border-border hover:border-foreground/20"
                }`}
              >
                <span className="text-sm font-medium text-foreground">Instant</span>
              </button>
              <button
                type="button"
                onClick={() => setMeetType("schedule")}
                className={`p-4 rounded-xl border-2 transition-all text-center ${
                  meetType === "schedule"
                    ? "border-foreground bg-muted"
                    : "border-border hover:border-foreground/20"
                }`}
              >
                <span className="text-sm font-medium text-foreground">Schedule</span>
              </button>
            </div>
          </div>

          {meetType === "schedule" && (
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Date & Time</label>
                <input
                  type="datetime-local"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-foreground bg-muted/50 focus:ring-2 focus:ring-foreground/10 focus:border-foreground/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Duration</label>
                <div className="grid grid-cols-4 gap-2">
                  {[15, 30, 45, 60].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDuration(m)}
                      className={`py-2 rounded-xl font-medium text-sm transition-all ${
                        duration === m
                          ? "bg-foreground text-background"
                          : "bg-muted text-foreground hover:bg-muted-foreground/10"
                      }`}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="p-3 bg-muted rounded-xl border border-border">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Email invite will be sent to {lead.email || "lead"}
            </p>
          </div>
        </div>
        <div className="p-5 border-t border-border flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-muted border border-border text-foreground rounded-xl hover:bg-muted-foreground/10 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={createMeeting}
            disabled={loading || (meetType === "schedule" && !scheduleDate)}
            className="flex-1 px-4 py-2.5 bg-foreground text-background rounded-xl hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
          >
            {loading ? (
              "Creating..."
            ) : meetType === "instant" ? (
              <>
                <Video className="h-4 w-4" />
                Start Now
              </>
            ) : (
              "Schedule"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

const DashboardClient = dynamic(() => Promise.resolve(Dashboard), {
  ssr: false,
})

export default DashboardClient
