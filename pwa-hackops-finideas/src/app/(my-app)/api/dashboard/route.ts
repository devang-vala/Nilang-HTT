import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '../../../../payload.config'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  try {
    // Require authentication
    const authResult = await requireAuth()
    if (!authResult.authenticated) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      )
    }

    const { user: currentUser } = authResult
    const payload = await getPayload({ config: configPromise })

    // Build query filter: admin sees all leads, user sees only their own
    const where: Record<string, { equals: string }> = {}
    if (currentUser.role !== 'admin') {
      where.createdBy = { equals: currentUser.id }
    }

    // Get leads based on role (depth 1 so createdBy is populated for admin client–agent link)
    const leads = await payload.find({
      collection: 'leads',
      limit: 500,
      sort: '-createdAt',
      where,
      overrideAccess: true,
      depth: 1,
    })

    // Get all pending scheduled emails
    const scheduledEmails = await payload.find({
      collection: 'scheduled-emails',
      where: { status: { equals: 'pending' } },
      limit: 1000,
      overrideAccess: true,
    })

    // Build lookup: leadId → pending scheduled emails
    const scheduledByLead = new Map<string, Array<{ scheduledAt: string; emailType: string }>>()
    for (const se of scheduledEmails.docs) {
      const leadId = typeof se.lead === 'string' ? se.lead : (se.lead as { id: string }).id
      if (!leadId) continue
      if (!scheduledByLead.has(leadId)) scheduledByLead.set(leadId, [])
      scheduledByLead.get(leadId)!.push({
        scheduledAt: se.scheduledAt,
        emailType: se.emailType ?? 'followup',
      })
    }

    // Sort by priority (hot > warm > cold)
    const priorityOrder: Record<string, number> = { hot: 1, warm: 2, cold: 3 }
    const sortedLeads = leads.docs.sort((a, b) => {
      const priorityA = priorityOrder[a.tags as string] || 4
      const priorityB = priorityOrder[b.tags as string] || 4
      if (priorityA !== priorityB) return priorityA - priorityB
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    // Calculate stats
    const stats = {
      total: leads.totalDocs,
      hot: leads.docs.filter((l) => l.tags === 'hot').length,
      warm: leads.docs.filter((l) => l.tags === 'warm').length,
      cold: leads.docs.filter((l) => l.tags === 'cold').length,
      pending: leads.docs.filter((l) => l.followUpStatus === 'pending').length,
      emailSent: leads.docs.filter((l) => l.followUpStatus === 'email_sent').length,
      meetingScheduled: leads.docs.filter((l) => l.followUpStatus === 'meeting_scheduled').length,
      converted: leads.docs.filter((l) => l.followUpStatus === 'converted').length,
    }

    // Resolve createdBy (agent) for client–agent relationship
    const getCreatedBy = (lead: (typeof leads.docs)[0]) => {
      const c = lead.createdBy as { id: string; name?: string } | string | null | undefined
      if (!c) return { id: null as string | null, name: null as string | null }
      if (typeof c === 'string') return { id: c, name: null }
      return { id: c.id, name: (c.name as string) ?? null }
    }

    // Format leads for response (include agent link for admin)
    const formattedLeads = sortedLeads.map((lead) => {
      const meetings = (lead.meetings as Array<{
        meetLink: string
        scheduledAt: string
        status: string
      }>) || []

      const emailsSent = (lead.emailsSent as Array<{
        subject: string
        template: string
        sentAt: string
        status: string
      }>) || []

      const createdBy = getCreatedBy(lead)
      const leadAny = lead as unknown as Record<string, unknown>
      const followUpTags = lead.followUpTags as Array<{ value: string; label?: string }> | string[] | null | undefined
      const followUpTagsNormalized = Array.isArray(followUpTags)
        ? followUpTags.map((t) => (typeof t === 'string' ? t : (t.label ?? t.value ?? '')))
        : []
      return {
        id: lead.id,
        name: lead.name,
        companyName: lead.companyName,
        email: lead.email,
        contactNo: lead.contactNo,
        tags: lead.tags,
        followUpStatus: lead.followUpStatus || 'pending',
        voiceNoteSummary: lead.voiceNoteSummary,
        voiceNoteTranscript: (lead.voiceNoteTranscript as string) ?? null,
        followUpTags: followUpTagsNormalized,
        locationName: (leadAny.locationName as string) ?? null,
        city: (leadAny.city as string) ?? null,
        state: (leadAny.state as string) ?? null,
        country: (leadAny.country as string) ?? null,
        qrData: (leadAny.qrData as string) ?? null,
        emailsSentCount: emailsSent.length,
        emailsSent,
        meetingsCount: meetings.length,
        meetings,
        latestMeetLink: meetings.length > 0 ? meetings[meetings.length - 1].meetLink : null,
        nextFollowUpDate: lead.nextFollowUpDate,
        createdAt: lead.createdAt,
        createdById: createdBy.id,
        createdByName: createdBy.name,
        scheduledEmails: scheduledByLead.get(lead.id as string) || [],
      }
    })

    // For admin: list of agents (unique by id) so dashboard can show "Filter by agent"
    const agents =
      currentUser.role === 'admin'
        ? Array.from(
            new Map(
              formattedLeads
                .filter((l) => (l as { createdById?: string | null }).createdById)
                .map((l) => {
                  const lead = l as { createdById: string | null; createdByName: string | null }
                  return [lead.createdById, { id: lead.createdById!, name: lead.createdByName || 'Unknown' }] as const
                })
            ).values()
          ).sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        : []

    return NextResponse.json({
      success: true,
      data: {
        leads: formattedLeads,
        stats,
        agents,
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, message: 'Error fetching dashboard', error: errorMessage },
      { status: 500 }
    )
  }
}