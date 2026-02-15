import { google } from 'googleapis'
import { getPayload } from 'payload'
import config from '../payload.config'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

// Set credentials if refresh token exists
if (process.env.GOOGLE_REFRESH_TOKEN) {
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  })
}

const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

interface CreateMeetingParams {
  leadId: string
  title: string
  description?: string
  startTime: Date
  endTime: Date
  sendInvite?: boolean
}

export async function createGoogleMeet({
  leadId,
  title,
  description,
  startTime,
  endTime,
  sendInvite = true,
}: CreateMeetingParams): Promise<{ meetLink: string; eventId: string } | null> {
  try {
    const payload = await getPayload({ config })

    // Get lead
    const lead = await payload.findByID({
      collection: 'leads',
      id: leadId,
    })

    if (!lead) {
      throw new Error('Lead not found')
    }

    // Create calendar event with Google Meet
    const event = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      sendUpdates: sendInvite ? 'all' : 'none',
      requestBody: {
        summary: title,
        description: description || `Meeting with ${lead.name} from ${lead.companyName || 'N/A'}`,
        start: {
          dateTime: startTime.toISOString(),
          timeZone: 'Asia/Kolkata',
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'Asia/Kolkata',
        },
        attendees: [{ email: lead.email }],
        conferenceData: {
          createRequest: {
            requestId: `meet-${leadId}-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      },
    })

    const meetLink = event.data.conferenceData?.entryPoints?.[0]?.uri || ''
    const eventId = event.data.id || ''

    // Update lead with meeting info
    const meetings = lead.meetings || []
    meetings.push({
      meetLink,
      scheduledAt: startTime.toISOString(),
      status: 'scheduled',
    })

    await payload.update({
      collection: 'leads',
      id: leadId,
      data: {
        meetings,
        followUpStatus: 'meeting_scheduled',
      },
    })

    return { meetLink, eventId }
  } catch (error) {
    console.error('Error creating Google Meet:', error)
    return null
  }
}

// Generate Google OAuth URL for authorization
export function getAuthUrl(): string {
  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ]

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  })
}

// Exchange authorization code for tokens
export async function getTokens(code: string) {
  const { tokens } = await oauth2Client.getToken(code)
  oauth2Client.setCredentials(tokens)
  return tokens
}