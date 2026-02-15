/* eslint-disable @typescript-eslint/no-explicit-any */
import { getPayload } from 'payload'
import config from '../payload.config'
import { sendTemplatedEmail, sendEmailToLead } from './emailService'
import type { EmailType } from './emailTemplates'

export async function processScheduledEmails(): Promise<void> {
  try {
    const payload = await getPayload({ config })
    const now = new Date()

    // Find all pending scheduled emails that are due
    const scheduledEmails = await payload.find({
      collection: 'scheduled-emails',
      where: {
        and: [
          { status: { equals: 'pending' } },
          { scheduledAt: { less_than_equal: now.toISOString() } },
        ],
      },
      limit: 50,
      overrideAccess: true,
    })

    if (scheduledEmails.docs.length === 0) return

    console.log(`[ScheduledEmail] Processing ${scheduledEmails.docs.length} due email(s) at ${now.toISOString()}`)

    for (const scheduled of scheduledEmails.docs) {
      try {
        const leadId = typeof scheduled.lead === 'string' ? scheduled.lead : scheduled.lead.id

        let success = false

        console.log(`[ScheduledEmail] Sending to lead ${leadId} (scheduled: ${scheduled.scheduledAt})`)

        // If a CMS template is linked, use it
        if (scheduled.template) {
          const templateId = typeof scheduled.template === 'string' ? scheduled.template : scheduled.template.id
          success = await sendTemplatedEmail(leadId, templateId)
        } else {
          // Otherwise, use the built-in templates based on emailType
          const emailType = ((scheduled as any).emailType || 'followup') as EmailType
          const result = await sendEmailToLead(leadId, emailType)
          success = result.success
          if (!success) console.error(`[ScheduledEmail] Failed:`, result.message)
        }

        await payload.update({
          collection: 'scheduled-emails',
          id: scheduled.id,
          data: {
            status: success ? 'sent' : 'failed',
            sentAt: success ? new Date().toISOString() : undefined,
            error: success ? undefined : 'Failed to send email',
          },
          overrideAccess: true,
        })

        console.log(`[ScheduledEmail] ${success ? '✓ Sent' : '✗ Failed'} for lead ${leadId}`)
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error'
        console.error(`[ScheduledEmail] Error for scheduled ${scheduled.id}:`, msg)
        await payload.update({
          collection: 'scheduled-emails',
          id: scheduled.id,
          data: {
            status: 'failed',
            error: msg,
          },
          overrideAccess: true,
        })
      }
    }
  } catch (error) {
    console.error('Error processing scheduled emails:', error)
  }
}