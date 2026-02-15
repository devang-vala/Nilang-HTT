import { getPayload } from 'payload'
import configPromise from '../payload.config'
import { sendEmailToLead } from './emailService'
import { generateEmailHTML } from './emailTemplates'

interface MeetingResult {
  success: boolean
  message: string
  data?: {
    meetLink: string
    roomName: string
    hostLink: string
    guestLink: string
    scheduledAt: string
  }
  error?: string
}

interface CreateMeetingParams {
  leadId: string
  scheduledAt?: string
  duration?: number
  sendInvite?: boolean
}

// Generate unique room name
function generateRoomName(leadName: string, leadId: string): string {
  const sanitizedName = leadName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 15)
  
  const timestamp = Date.now().toString(36)
  const randomStr = Math.random().toString(36).substring(2, 6)
  
  return `HackOps${sanitizedName}${timestamp}${randomStr}`
}

// Generate Jitsi Meet links with proper config
function generateJitsiLinks(roomName: string, hostName: string, guestName: string) {
  const jitsiServer = process.env.JITSI_SERVER || 'meet.jit.si'
  const baseUrl = `https://${jitsiServer}/${roomName}`

  // Host link - with moderator settings
  const hostParams = new URLSearchParams({
    'config.prejoinPageEnabled': 'true',
    'config.startWithAudioMuted': 'false',
    'config.startWithVideoMuted': 'false',
    'config.disableDeepLinking': 'true',
    'userInfo.displayName': hostName,
  })

  // Guest link - simpler settings for the lead
  const guestParams = new URLSearchParams({
    'config.prejoinPageEnabled': 'true',
    'config.startWithAudioMuted': 'true',
    'config.startWithVideoMuted': 'false',
    'config.disableDeepLinking': 'true',
    'userInfo.displayName': guestName,
  })

  return {
    baseLink: baseUrl,
    hostLink: `${baseUrl}#${hostParams.toString()}`,
    guestLink: `${baseUrl}#${guestParams.toString()}`,
  }
}

// Send instant meeting email to lead
async function sendInstantMeetingEmail(
  leadId: string,
  leadEmail: string,
  leadName: string,
  meetLink: string
): Promise<boolean> {
  try {
    const payload = await getPayload({ config: configPromise })

    const subject = `🎥 Join our meeting now - HackOps`
    const body = `
Dear ${leadName},

You're invited to join a meeting with us right now!

🔗 **Click here to join:** ${meetLink}

**How to Join:**
1. Click the link above
2. Allow camera & microphone access when prompted
3. Enter your name and click "Join Meeting"

💡 No downloads required - works directly in your browser!

We're waiting for you in the meeting room.

Best regards,
HackOps Team
    `.trim()

    const html = generateEmailHTML(body, leadEmail)

    await payload.sendEmail({
      to: leadEmail,
      subject,
      html,
    })

    console.log(`✅ Instant meeting invite sent to ${leadEmail}`)
    return true
  } catch (error) {
    console.error('❌ Failed to send instant meeting email:', error)
    return false
  }
}

// Create instant meeting
export async function createInstantMeeting(
  leadId: string,
  sendInvite: boolean = true
): Promise<MeetingResult> {
  try {
    const payload = await getPayload({ config: configPromise })

    // Get lead
    const lead = await payload.findByID({
      collection: 'leads',
      id: leadId,
    })

    if (!lead) {
      return { success: false, message: 'Lead not found' }
    }

    const leadName = lead.name as string
    const leadEmail = lead.email as string

    // Generate room name and links
    const roomName = generateRoomName(leadName, leadId)
    const { baseLink, hostLink, guestLink } = generateJitsiLinks(
      roomName,
      'HackOps Team',
      leadName
    )

    // Update lead with meeting info
    const existingMeetings = (lead.meetings as Array<{
      meetLink: string
      scheduledAt: string
      status: string
    }>) || []

    existingMeetings.push({
      meetLink: guestLink,
      scheduledAt: new Date().toISOString(),
      status: 'scheduled',
    })

    await payload.update({
      collection: 'leads',
      id: leadId,
      data: {
        meetings: existingMeetings,
        followUpStatus: 'meeting_scheduled',
      },
    })

    // Send email invite to lead
    if (sendInvite) {
      await sendInstantMeetingEmail(leadId, leadEmail, leadName, guestLink)
    }

    console.log(`✅ Instant meeting created: ${roomName}`)

    return {
      success: true,
      message: `Meeting created! Invite sent to ${leadEmail}`,
      data: {
        meetLink: baseLink,
        roomName,
        hostLink,
        guestLink,
        scheduledAt: new Date().toISOString(),
      },
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Instant meeting error:', errorMessage)
    return {
      success: false,
      message: 'Failed to create meeting',
      error: errorMessage,
    }
  }
}

// Create scheduled meeting
export async function createScheduledMeeting({
  leadId,
  scheduledAt,
  duration = 30,
  sendInvite = true,
}: CreateMeetingParams): Promise<MeetingResult> {
  try {
    if (!scheduledAt) {
      return { success: false, message: 'scheduledAt is required' }
    }

    const payload = await getPayload({ config: configPromise })

    // Get lead
    const lead = await payload.findByID({
      collection: 'leads',
      id: leadId,
    })

    if (!lead) {
      return { success: false, message: 'Lead not found' }
    }

    const leadName = lead.name as string
    const leadEmail = lead.email as string

    // Generate room name and links
    const roomName = generateRoomName(leadName, leadId)
    const { baseLink, hostLink, guestLink } = generateJitsiLinks(
      roomName,
      'HackOps Team',
      leadName
    )

    // Format date for display
    const meetingDate = new Date(scheduledAt)
    const formattedDate = meetingDate.toLocaleString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
    })

    // Update lead with meeting info
    const existingMeetings = (lead.meetings as Array<{
      meetLink: string
      scheduledAt: string
      status: string
    }>) || []

    existingMeetings.push({
      meetLink: guestLink,
      scheduledAt: meetingDate.toISOString(),
      status: 'scheduled',
    })

    await payload.update({
      collection: 'leads',
      id: leadId,
      data: {
        meetings: existingMeetings,
        followUpStatus: 'meeting_scheduled',
        nextFollowUpDate: meetingDate.toISOString(),
      },
    })

    // Send meeting invite email to lead
    if (sendInvite) {
      await sendScheduledMeetingEmail(
        leadEmail,
        leadName,
        lead.companyName as string || 'your company',
        guestLink,
        formattedDate,
        duration
      )
    }

    console.log(`✅ Scheduled meeting created for ${formattedDate}`)

    return {
      success: true,
      message: `Meeting scheduled! Invite sent to ${leadEmail}`,
      data: {
        meetLink: baseLink,
        roomName,
        hostLink,
        guestLink,
        scheduledAt: meetingDate.toISOString(),
      },
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Scheduled meeting error:', errorMessage)
    return {
      success: false,
      message: 'Failed to create meeting',
      error: errorMessage,
    }
  }
}

// Send scheduled meeting email
async function sendScheduledMeetingEmail(
  leadEmail: string,
  leadName: string,
  companyName: string,
  meetLink: string,
  formattedDate: string,
  duration: number
): Promise<boolean> {
  try {
    const payload = await getPayload({ config: configPromise })

    const subject = `📅 Meeting Scheduled - ${formattedDate}`
    const body = `
Dear ${leadName},

Your meeting has been scheduled! Here are the details:

📅 **Date & Time:** ${formattedDate}
⏱️ **Duration:** ${duration} minutes
🔗 **Meeting Link:** ${meetLink}

**How to Join:**
1. Click the meeting link at the scheduled time
2. Allow camera & microphone access when prompted
3. Enter your name and click "Join Meeting"

💡 **Tips:**
• No downloads required - works in Chrome, Firefox, Safari
• Join 2-3 minutes early to test your audio/video
• Use headphones for better audio quality

We're looking forward to speaking with you about ${companyName}'s needs!

Best regards,
HackOps Team
    `.trim()

    const html = generateEmailHTML(body, leadEmail)

    await payload.sendEmail({
      to: leadEmail,
      subject,
      html,
    })

    console.log(`✅ Scheduled meeting invite sent to ${leadEmail}`)
    return true
  } catch (error) {
    console.error('❌ Failed to send scheduled meeting email:', error)
    return false
  }
}