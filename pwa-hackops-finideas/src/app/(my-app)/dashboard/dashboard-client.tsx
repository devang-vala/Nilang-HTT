"use client"

import dynamic from "next/dynamic"
import { useEffect, useState } from "react"
import { useCurrentUser } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"

interface Meeting {
  meetLink: string
  scheduledAt: string
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
  emailsSent: Array<unknown>
  meetings: Meeting[]
  createdAt: string
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

// Main Dashboard Component - No SSR
function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [filterByAgentId, setFilterByAgentId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [showMeetModal, setShowMeetModal] = useState(false)
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
    if (tag === "hot") return "bg-red-500"
    if (tag === "warm") return "bg-yellow-500"
    return "bg-blue-500"
  }

  const getStatusColor = (status: string | undefined | null) => {
    if (status === "email_sent") return "bg-blue-100 text-blue-800"
    if (status === "meeting_scheduled") return "bg-purple-100 text-purple-800"
    if (status === "converted") return "bg-green-100 text-green-800"
    return "bg-gray-100 text-gray-800"
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const filteredLeads = filterByAgentId
      ? leads.filter((l) => (l.createdById ?? null) === filterByAgentId)
      : leads

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">🚀 Lead Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {isAdmin ? '👑 Admin — See which clients are handled by which agent' : `👤 Your Leads — ${user?.name || 'User'}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && agents.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
              <span>Filter by agent:</span>
              <select
                value={filterByAgentId ?? ''}
                onChange={(e) => setFilterByAgentId(e.target.value || null)}
                className="rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-gray-900 dark:text-slate-100"
              >
                <option value="">All agents</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name || `Agent ${a.id.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </label>
          )}
          {isAdmin && (
            // eslint-disable-next-line @next/next/no-html-link-for-pages
            <a
              href="/admin"
              className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm rounded-lg hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
            >
              ⚙️ Admin Panel
            </a>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow">
            <p className="text-gray-500 dark:text-slate-400 text-sm">Total</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">{stats.total || 0}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-lg shadow">
            <p className="text-red-500 dark:text-red-400 text-sm">🔥 Hot</p>
            <p className="text-3xl font-bold text-red-600 dark:text-red-300">{stats.hot || 0}</p>
          </div>
          <div className="bg-yellow-50 dark:bg-amber-900/30 p-4 rounded-lg shadow">
            <p className="text-yellow-600 dark:text-amber-400 text-sm">🌡️ Warm</p>
            <p className="text-3xl font-bold text-yellow-600 dark:text-amber-300">{stats.warm || 0}</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg shadow">
            <p className="text-blue-500 dark:text-blue-400 text-sm">❄️ Cold</p>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-300">{stats.cold || 0}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-slate-700/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-slate-400">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-slate-400">Email</th>
              {isAdmin && (
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-slate-400">Handled by</th>
              )}
              {isAdmin && (
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-slate-400">Address</th>
              )}
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-slate-400">Priority</th>
              {isAdmin && (
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-slate-400">Follow-up tags</th>
              )}
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-slate-400">Status</th>
              {isAdmin && (
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-slate-400">Transcript</th>
              )}
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-slate-600">
            {filteredLeads.length > 0 ? (
              filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-slate-100">{lead.name || "Unknown"}</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">{lead.companyName || "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-slate-200">{lead.email || "—"}</td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                      {lead.createdByName ? (
                        <span className="font-medium" title={`Client–agent link: ${lead.createdByName}`}>
                          {lead.createdByName}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-slate-500">—</span>
                      )}
                    </td>
                  )}
                  {isAdmin && (
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-300 max-w-[200px]">
                      <span className="line-clamp-2" title={fullAddress(lead)}>
                        {fullAddress(lead)}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-white text-xs ${getTagColor(lead.tags)}`}>
                      {lead.tags ? lead.tags.toUpperCase() : "N/A"}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      {lead.followUpTags && lead.followUpTags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {lead.followUpTags.slice(0, 3).map((t) => (
                            <span key={t} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs">
                              {t.replace(/_/g, " ")}
                            </span>
                          ))}
                          {lead.followUpTags.length > 3 && (
                            <span className="text-xs text-gray-500 dark:text-slate-400">+{lead.followUpTags.length - 3}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-slate-500 text-sm">—</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(lead.followUpStatus)}`}>
                      {(lead.followUpStatus || "pending").replace(/_/g, " ")}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-300 max-w-[220px]">
                      {lead.voiceNoteTranscript ? (
                        <span
                          className="line-clamp-2 block cursor-help"
                          title={lead.voiceNoteTranscript}
                        >
                          {lead.voiceNoteTranscript.length > 100
                            ? `${lead.voiceNoteTranscript.slice(0, 100)}…`
                            : lead.voiceNoteTranscript}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-slate-500">—</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEmailModal(lead)}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        📧 Email
                      </button>
                      <button
                        onClick={() => openMeetModal(lead)}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                      >
                        📹 Meet
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={isAdmin ? 9 : 5} className="px-4 py-8 text-center text-gray-500 dark:text-slate-400">
                  {filterByAgentId && leads.length > 0 ? "No leads for this agent" : "No leads found"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">📧 Send Email to {lead.name || "Lead"}</h2>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Email Type</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEmailType("initial")}
                className={`flex-1 py-2 rounded ${emailType === "initial" ? "bg-blue-600 text-white" : "bg-gray-100"}`}
              >
                👋 Initial
              </button>
              <button
                type="button"
                onClick={() => setEmailType("followup")}
                className={`flex-1 py-2 rounded ${emailType === "followup" ? "bg-blue-600 text-white" : "bg-gray-100"}`}
              >
                🔄 Follow Up
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Template: <strong>{leadTags.toUpperCase()}</strong> priority
          </p>
        </div>
        <div className="p-4 border-t flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 py-2 bg-gray-200 rounded">
            Cancel
          </button>
          <button
            type="button"
            onClick={sendEmail}
            disabled={loading}
            className="flex-1 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
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
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl w-full max-w-md">
          <div className="p-4 border-b bg-green-50">
            <h2 className="text-lg font-semibold text-green-800">✅ Meeting Created!</h2>
            <p className="text-sm text-green-600">Invite sent to {lead.email || "lead"}</p>
          </div>
          <div className="p-4 space-y-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-xs text-blue-600 mb-1">🎤 Your Host Link</p>
              <div className="flex gap-2">
                <input
                  value={meetingData.hostLink}
                  readOnly
                  className="flex-1 text-xs bg-white border rounded px-2 py-1"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(meetingData.hostLink)}
                  className="px-2 bg-blue-200 rounded"
                >
                  📋
                </button>
              </div>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <p className="text-xs text-orange-600 mb-1">👤 Guest Link (sent to {lead.name || "guest"})</p>
              <div className="flex gap-2">
                <input
                  value={meetingData.guestLink}
                  readOnly
                  className="flex-1 text-xs bg-white border rounded px-2 py-1"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(meetingData.guestLink)}
                  className="px-2 bg-orange-200 rounded"
                >
                  📋
                </button>
              </div>
            </div>
          </div>
          <div className="p-4 border-t flex gap-2">
            <button type="button" onClick={onSuccess} className="flex-1 py-2 bg-gray-200 rounded">
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                if (meetingData.hostLink) {
                  window.open(meetingData.hostLink, "_blank")
                }
              }}
              className="flex-1 py-2 bg-green-600 text-white rounded"
            >
              ▶ Start Meeting
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Create Meeting View
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">📹 Create Meeting with {lead.name || "Lead"}</h2>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Meeting Type</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMeetType("instant")}
                className={`flex-1 py-3 rounded-lg border-2 ${
                  meetType === "instant" ? "border-green-500 bg-green-50" : "border-gray-200"
                }`}
              >
                <span className="block text-xl">⚡</span>
                <span className="text-sm">Instant</span>
              </button>
              <button
                type="button"
                onClick={() => setMeetType("schedule")}
                className={`flex-1 py-3 rounded-lg border-2 ${
                  meetType === "schedule" ? "border-green-500 bg-green-50" : "border-gray-200"
                }`}
              >
                <span className="block text-xl">📅</span>
                <span className="text-sm">Schedule</span>
              </button>
            </div>
          </div>

          {meetType === "schedule" && (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium mb-1">Date & Time</p>
                <input
                  type="datetime-local"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Duration</p>
                <div className="flex gap-2">
                  {[15, 30, 45, 60].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDuration(m)}
                      className={`flex-1 py-2 rounded ${
                        duration === m ? "bg-green-600 text-white" : "bg-gray-100"
                      }`}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <p className="text-sm text-green-600 bg-green-50 p-2 rounded">
            ✓ Email invite will be sent to {lead.email || "lead"}
          </p>
        </div>
        <div className="p-4 border-t flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 py-2 bg-gray-200 rounded">
            Cancel
          </button>
          <button
            type="button"
            onClick={createMeeting}
            disabled={loading || (meetType === "schedule" && !scheduleDate)}
            className="flex-1 py-2 bg-green-600 text-white rounded disabled:opacity-50"
          >
            {loading ? "Creating..." : meetType === "instant" ? "▶ Start Now" : "📅 Schedule"}
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