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
  /** Agent who created/owns this lead (client–agent relationship) */
  createdById?: string | null
  createdByName?: string | null
}

/** Build full address from lead location fields */
function fullAddress(lead: Lead): string {
  const parts = [
    lead.locationName,
    [lead.city, lead.state, lead.country].filter(Boolean).join(", "),
  ].filter(Boolean)
  return parts.join(" · ") || "—"
}

/** Extract phone numbers from text (Indian and international formats) */
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

// Info Modal Component for viewing details
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
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-linear-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-2">
            {type === 'transcript' && <FileText className="h-5 w-5 text-blue-600" />}
            {type === 'location' && <MapPin className="h-5 w-5 text-green-600" />}
            {type === 'qrData' && <QrCodeIcon className="h-5 w-5 text-purple-600" />}
            {type === 'emailHistory' && <Mail className="h-5 w-5 text-orange-600" />}
            <h3 className="font-semibold text-slate-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
          >
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto max-h-[calc(80vh-120px)]">
          {type === 'emailHistory' ? (
            emailHistory && emailHistory.length > 0 ? (
              <div className="space-y-3">
                {emailHistory.map((email, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900 text-sm mb-1">{email.subject}</p>
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            email.template.includes('followup') || email.template.includes('follow')
                              ? 'bg-green-100 text-green-700 border border-green-200'
                              : 'bg-blue-100 text-blue-700 border border-blue-200'
                          }`}>
                            {email.template.includes('followup') || email.template.includes('follow') ? '🔄 Follow-up' : '👋 Initial'}
                          </span>
                          <span className="text-xs text-slate-500">
                            Template: {email.template}
                          </span>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        email.status === 'sent'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {email.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Sent: {new Date(email.sentAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-center py-8">No emails sent yet</p>
            )
          ) : !content ? (
            <p className="text-slate-400 text-center py-8">No data available</p>
          ) : (
            <>
              {/* Phone numbers extracted from transcript */}
              {type === 'transcript' && phoneNumbers.length > 0 && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="text-xs font-medium text-emerald-800 mb-2 flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    Detected Phone Numbers
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {phoneNumbers.map((phone, idx) => (
                      <button
                        key={idx}
                        onClick={() => copyToClipboard(phone, true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-300 rounded-md hover:bg-emerald-50 transition-colors group"
                      >
                        <span className="text-sm font-mono text-slate-700">{phone}</span>
                        {copiedPhone === phone ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* QR Data with copy button */}
              {type === 'qrData' && (
                <div className="mb-4">
                  <button
                    onClick={() => copyToClipboard(content)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors group"
                  >
                    <span className="text-sm text-slate-700 break-all text-left">{content}</span>
                    {copiedQr ? (
                      <CheckCircle2 className="h-4 w-4 text-purple-600 shrink-0" />
                    ) : (
                      <Copy className="h-4 w-4 text-slate-400 group-hover:text-purple-600 transition-colors shrink-0" />
                    )}
                  </button>
                </div>
              )}

              {/* Main content */}
              <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-lg border border-slate-200">
                {content}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// Main Dashboard Component - No SSR
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

  // Redirect if not authenticated
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
        
        // Debug: Log email history for leads to verify data
        if (json.data.leads && json.data.leads.length > 0) {
          console.log('Dashboard loaded with', json.data.leads.length, 'leads')
          json.data.leads.forEach((lead: Lead) => {
            if (lead.emailsSent && lead.emailsSent.length > 0) {
              console.log(`Lead ${lead.name} emails:`, lead.emailsSent.map(e => e.template))
            }
          })
        }
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

  const getTagColor = (tag: string | undefined | null) => {
    if (tag === "hot") return "bg-linear-to-r from-red-500 to-orange-500 text-white"
    if (tag === "warm") return "bg-linear-to-r from-yellow-500 to-amber-500 text-white"
    return "bg-linear-to-r from-blue-500 to-cyan-500 text-white"
  }

  const getStatusColor = (status: string | undefined | null) => {
    if (status === "email_sent") return "bg-blue-100 text-blue-700 border border-blue-200"
    if (status === "meeting_scheduled") return "bg-purple-100 text-purple-700 border border-purple-200"
    if (status === "converted") return "bg-green-100 text-green-700 border border-green-200"
    return "bg-slate-100 text-slate-700 border border-slate-200"
  }

  const openEmailModal = (lead: Lead) => {
    setSelectedLead(lead)
    setShowEmailModal(true)
  }

  const openMeetModal = (lead: Lead) => {
    setSelectedLead(lead)
    setShowMeetModal(true)
  }

  const closeEmailModal = () => {
    setShowEmailModal(false)
    setSelectedLead(null)
  }

  const closeMeetModal = () => {
    setShowMeetModal(false)
    setSelectedLead(null)
  }

  const handleEmailSuccess = () => {
    closeEmailModal()
    fetchData()
  }

  const handleMeetSuccess = () => {
    closeMeetModal()
    fetchData()
  }

  // Check if lead has been emailed (moves to follow-up stage)
  const hasBeenEmailed = (lead: Lead): boolean => {
    return Array.isArray(lead.emailsSent) && lead.emailsSent.length > 0
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const filteredLeads = filterByAgentId
      ? leads.filter((l) => (l.createdById ?? null) === filterByAgentId)
      : leads

  // Separate leads into initial and follow-up sections
  // Leads move to follow-up as soon as any email is sent
  const initialLeads = filteredLeads.filter(lead => !hasBeenEmailed(lead))
  const followUpLeads = filteredLeads.filter(lead => hasBeenEmailed(lead))
  
  // Get active section leads
  const currentSectionLeads = activeSection === 'initial' ? initialLeads : followUpLeads

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Lead Dashboard
              </h1>
              <p className="text-sm text-slate-600 mt-2">
                {isAdmin ? `👑 Admin View — ${initialLeads.length} initial, ${followUpLeads.length} follow-up` : `Welcome back, ${user?.name || 'User'}`}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {isAdmin && agents.length > 0 && (
                <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm border border-slate-200 px-4 py-2">
                  <Filter className="h-4 w-4 text-slate-500" />
                  <select
                    value={filterByAgentId ?? ''}
                    onChange={(e) => setFilterByAgentId(e.target.value || null)}
                    className="text-sm text-slate-700 bg-transparent border-none outline-none cursor-pointer"
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
                  className="px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 transition-all shadow-sm hover:shadow-md"
                >
                  ⚙️ Admin Panel
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Total Leads</p>
              <p className="text-3xl font-bold text-slate-900">{stats.total || 0}</p>
            </div>
            <div className="bg-linear-to-br from-red-50 to-red-100 p-5 rounded-xl shadow-sm border border-red-200 hover:shadow-md transition-shadow">
              <p className="text-xs font-medium text-red-700 uppercase tracking-wide mb-1">🔥 Hot</p>
              <p className="text-3xl font-bold text-red-600">{stats.hot || 0}</p>
            </div>
            <div className="bg-linear-to-br from-yellow-50 to-amber-100 p-5 rounded-xl shadow-sm border border-yellow-200 hover:shadow-md transition-shadow">
              <p className="text-xs font-medium text-yellow-700 uppercase tracking-wide mb-1">🌡️ Warm</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.warm || 0}</p>
            </div>
            <div className="bg-linear-to-br from-blue-50 to-blue-100 p-5 rounded-xl shadow-sm border border-blue-200 hover:shadow-md transition-shadow">
              <p className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-1">❄️ Cold</p>
              <p className="text-3xl font-bold text-blue-600">{stats.cold || 0}</p>
            </div>
          </div>
        )}

        {/* Section Tabs */}
        <div className="mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2 inline-flex gap-2">
            <button
              onClick={() => setActiveSection('initial')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-all ${
                activeSection === 'initial'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Initial Contacts</span>
              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                activeSection === 'initial'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 text-slate-700'
              }`}>
                {initialLeads.length}
              </span>
            </button>
            <button
              onClick={() => setActiveSection('followup')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-all ${
                activeSection === 'followup'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <UserCheck className="h-4 w-4" />
              <span>Follow-up Stage</span>
              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                activeSection === 'followup'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 text-slate-700'
              }`}>
                {followUpLeads.length}
              </span>
            </button>
          </div>
        </div>

        {/* Leads Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-linear-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Lead Info
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Contact
                  </th>
                  {isAdmin && (
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Agent
                    </th>
                  )}
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3.5 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-4 py-3.5 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentSectionLeads.length > 0 ? (
                  currentSectionLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                      {/* Lead Info */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                            {(lead.name || 'U')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 text-sm">{lead.name || "Unknown"}</p>
                            <p className="text-xs text-slate-500">{lead.companyName || "—"}</p>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <p className="text-sm text-slate-700">{lead.email || "—"}</p>
                          <p className="text-xs text-slate-500">{lead.contactNo || "—"}</p>
                          {lead.emailsSent && lead.emailsSent.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <Mail className="h-3 w-3 text-blue-500" />
                              <span className="text-xs text-blue-600 font-medium">
                                {lead.emailsSent.length} email{lead.emailsSent.length > 1 ? 's' : ''} sent
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Agent (Admin only) */}
                      {isAdmin && (
                        <td className="px-4 py-4">
                          {lead.createdByName ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {lead.createdByName}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                      )}

                      {/* Priority */}
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getTagColor(lead.tags)}`}>
                          {lead.tags ? lead.tags.toUpperCase() : "N/A"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.followUpStatus)}`}>
                          {(lead.followUpStatus || "pending").replace(/_/g, " ")}
                        </span>
                      </td>

                      {/* Detail Buttons */}
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-1.5">
                          
                          
                          {/* Transcript */}
                          <button
                            onClick={() => setInfoModal({
                              show: true,
                              title: `${lead.name}'s Transcript`,
                              content: lead.voiceNoteTranscript || null,
                              type: 'transcript'
                            })}
                            disabled={!lead.voiceNoteTranscript}
                            className={`p-2 rounded-lg transition-all ${
                              lead.voiceNoteTranscript
                                ? 'bg-blue-100 text-blue-600 hover:bg-blue-200 hover:shadow-sm'
                                : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                            }`}
                            title={lead.voiceNoteTranscript ? "View transcript" : "No transcript"}
                          >
                            <FileText className="h-4 w-4" />
                          </button>

                          {/* Location */}
                          <button
                            onClick={() => setInfoModal({
                              show: true,
                              title: `${lead.name}'s Location`,
                              content: fullAddress(lead) !== "—" ? fullAddress(lead) : null,
                              type: 'location'
                            })}
                            disabled={fullAddress(lead) === "—"}
                            className={`p-2 rounded-lg transition-all ${
                              fullAddress(lead) !== "—"
                                ? 'bg-green-100 text-green-600 hover:bg-green-200 hover:shadow-sm'
                                : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                            }`}
                            title={fullAddress(lead) !== "—" ? "View location" : "No location"}
                          >
                            <MapPin className="h-4 w-4" />
                          </button>

                          {/* QR Data */}
                          <button
                            onClick={() => setInfoModal({
                              show: true,
                              title: `${lead.name}'s QR Data`,
                              content: lead.qrData || null,
                              type: 'qrData'
                            })}
                            disabled={!lead.qrData}
                            className={`p-2 rounded-lg transition-all ${
                              lead.qrData
                                ? 'bg-purple-100 text-purple-600 hover:bg-purple-200 hover:shadow-sm'
                                : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                            }`}
                            title={lead.qrData ? "View QR data" : "No QR data"}
                          >
                            <QrCodeIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>

                      {/* Action Buttons */}
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEmailModal(lead)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-all hover:shadow-md"
                          >
                            <Mail className="h-3.5 w-3.5" />
                            Email
                          </button>
                          <button
                            onClick={() => openMeetModal(lead)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-all hover:shadow-md"
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
                    <td colSpan={isAdmin ? 7 : 6} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                          {activeSection === 'initial' ? (
                            <Users className="h-8 w-8 text-slate-400" />
                          ) : (
                            <UserCheck className="h-8 w-8 text-slate-400" />
                          )}
                        </div>
                        <p className="text-slate-500 font-medium">
                          {activeSection === 'initial' 
                            ? 'No initial contacts found' 
                            : 'No follow-up leads yet'}
                        </p>
                        <p className="text-xs text-slate-400">
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

      {/* Info Modal */}
      {infoModal?.show && (
        <InfoModal
          title={infoModal.title}
          content={infoModal.content}
          type={infoModal.type}
          onClose={() => setInfoModal(null)}
        />
      )}

      {/* Email Modal */}
      {showEmailModal && selectedLead && (
        <EmailModal
          lead={selectedLead}
          onClose={closeEmailModal}
          onSuccess={handleEmailSuccess}
        />
      )}

      {/* Meet Modal */}
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

// Email Modal Component
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
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-200 bg-linear-to-r from-blue-50 to-cyan-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
              <Mail className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Send Email</h2>
              <p className="text-sm text-slate-600">To {lead.name || "Lead"}</p>
            </div>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-sm font-medium text-slate-700 mb-3">Email Type</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setEmailType("initial")}
                className={`p-4 rounded-lg border-2 transition-all ${
                  emailType === "initial"
                    ? "border-blue-500 bg-blue-50 shadow-sm"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <span className="block text-2xl mb-1">👋</span>
                <span className="text-sm font-medium text-slate-700">Initial</span>
              </button>
              <button
                type="button"
                onClick={() => setEmailType("followup")}
                className={`p-4 rounded-lg border-2 transition-all ${
                  emailType === "followup"
                    ? "border-blue-500 bg-blue-50 shadow-sm"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <span className="block text-2xl mb-1">🔄</span>
                <span className="text-sm font-medium text-slate-700">Follow Up</span>
              </button>
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-600">
              Template priority: <span className="font-semibold text-slate-900">{leadTags.toUpperCase()}</span>
            </p>
          </div>
        </div>
        <div className="p-5 border-t border-slate-200 bg-slate-50 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={sendEmail}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
          >
            {loading ? "Sending..." : "Send Email"}
          </button>
        </div>
      </div>
    </div>
  )
}

// Meet Modal Component
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

  // Success View
  if (meetingData) {
    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onSuccess}>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-green-200 bg-linear-to-r from-green-50 to-emerald-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-green-900">Meeting Created!</h2>
                <p className="text-sm text-green-700">Invite sent to {lead.email || "lead"}</p>
              </div>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1.5">
                <Video className="h-3.5 w-3.5" />
                Your Host Link
              </p>
              <div className="flex gap-2">
                <input
                  value={meetingData.hostLink}
                  readOnly
                  className="flex-1 text-xs bg-white border border-blue-200 rounded px-3 py-2 text-slate-700"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(meetingData.hostLink)}
                  className="px-3 bg-blue-200 hover:bg-blue-300 rounded transition-colors"
                  title="Copy"
                >
                  <Copy className="h-4 w-4 text-blue-700" />
                </button>
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <p className="text-xs font-semibold text-purple-700 mb-2 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                Guest Link (sent to {lead.name || "guest"})
              </p>
              <div className="flex gap-2">
                <input
                  value={meetingData.guestLink}
                  readOnly
                  className="flex-1 text-xs bg-white border border-purple-200 rounded px-3 py-2 text-slate-700"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(meetingData.guestLink)}
                  className="px-3 bg-purple-200 hover:bg-purple-300 rounded transition-colors"
                  title="Copy"
                >
                  <Copy className="h-4 w-4 text-purple-700" />
                </button>
              </div>
            </div>
          </div>
          <div className="p-5 border-t border-slate-200 bg-slate-50 flex gap-3">
            <button
              type="button"
              onClick={onSuccess}
              className="flex-1 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
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
              className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm flex items-center justify-center gap-2"
            >
              <Video className="h-4 w-4" />
              Start Meeting
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Create Meeting View
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-200 bg-linear-to-r from-green-50 to-emerald-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
              <Video className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Create Meeting</h2>
              <p className="text-sm text-slate-600">With {lead.name || "Lead"}</p>
            </div>
          </div>
        </div>
        <div className="p-5 space-y-5">
          <div>
            <p className="text-sm font-medium text-slate-700 mb-3">Meeting Type</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMeetType("instant")}
                className={`p-4 rounded-lg border-2 transition-all ${
                  meetType === "instant"
                    ? "border-green-500 bg-green-50 shadow-sm"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <span className="block text-2xl mb-1">⚡</span>
                <span className="text-sm font-medium text-slate-700">Instant</span>
              </button>
              <button
                type="button"
                onClick={() => setMeetType("schedule")}
                className={`p-4 rounded-lg border-2 transition-all ${
                  meetType === "schedule"
                    ? "border-green-500 bg-green-50 shadow-sm"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <span className="block text-2xl mb-1">📅</span>
                <span className="text-sm font-medium text-slate-700">Schedule</span>
              </button>
            </div>
          </div>

          {meetType === "schedule" && (
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Date & Time</label>
                <input
                  type="datetime-local"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Duration</label>
                <div className="grid grid-cols-4 gap-2">
                  {[15, 30, 45, 60].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDuration(m)}
                      className={`py-2 rounded-lg font-medium text-sm transition-all ${
                        duration === m
                          ? "bg-green-600 text-white shadow-sm"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-xs text-green-700 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Email invite will be sent to {lead.email || "lead"}
            </p>
          </div>
        </div>
        <div className="p-5 border-t border-slate-200 bg-slate-50 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={createMeeting}
            disabled={loading || (meetType === "schedule" && !scheduleDate)}
            className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              "Creating..."
            ) : meetType === "instant" ? (
              <>
                <Video className="h-4 w-4" />
                Start Now
              </>
            ) : (
              <>
                📅 Schedule
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// Export with dynamic import to prevent SSR hydration issues
const DashboardClient = dynamic(() => Promise.resolve(Dashboard), {
  ssr: false,
})

export default DashboardClient