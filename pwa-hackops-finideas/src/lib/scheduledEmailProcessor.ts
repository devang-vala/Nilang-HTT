import { getPayload } from 'payload'
import config from '../payload.config'
import { sendTemplatedEmail } from './emailService'

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
    })

    console.log(`Processing ${scheduledEmails.docs.length} scheduled emails...`)

    for (const scheduled of scheduledEmails.docs) {
      try {
        const leadId = typeof scheduled.lead === 'string' ? scheduled.lead : scheduled.lead.id
        const templateId = typeof scheduled.template === 'string' ? scheduled.template : scheduled.template.id

        const success = await sendTemplatedEmail(leadId, templateId)

        await payload.update({
          collection: 'scheduled-emails',
          id: scheduled.id,
          data: {
            status: success ? 'sent' : 'failed',
            sentAt: success ? new Date().toISOString() : undefined,
            error: success ? undefined : 'Failed to send email',
          },
        })
      } catch (error: any) {
        await payload.update({
          collection: 'scheduled-emails',
          id: scheduled.id,
          data: {
            status: 'failed',
            error: error.message,
          },
        })
      }
    }
  } catch (error) {
    console.error('Error processing scheduled emails:', error)
  }
}