import { getPayload } from 'payload'
import configPromise from '../payload.config'
import { Priority, EmailType, getParsedTemplate, generateEmailHTML } from './emailTemplates'
import type { Lead } from '../payload-types'

interface SendEmailResult {
  success: boolean
  message: string
  error?: string
}

// Extended Lead interface with missing fields
interface ExtendedLead {
  id: string
  name: string
  email: string
  companyName?: string | null
  tags: 'hot' | 'warm' | 'cold'
  emailsSent?: Array<{
    subject?: string
    template?: string
    sentAt?: string
    status?: 'sent' | 'failed'
  }>
  followUpStatus?: 'pending' | 'email_sent' | 'meeting_scheduled' | 'converted' | 'lost'
}

// Send email to lead using template based on priority
export async function sendEmailToLead(
  leadId: string,
  emailType: EmailType,
  extraData?: { meetLink?: string; date?: string }
): Promise<SendEmailResult> {
  try {
    const payload = await getPayload({ config: configPromise })

    const lead = await payload.findByID({
      collection: 'leads',
      id: leadId,
    }) as ExtendedLead

    if (!lead) {
      return { success: false, message: 'Lead not found' }
    }

    const leadName = lead.name
    const leadEmail = lead.email
    const leadCompany = lead.companyName || 'your company'
    const priority = lead.tags as Priority

    const { subject, body } = getParsedTemplate(priority, emailType, {
      name: leadName,
      companyName: leadCompany,
      meetLink: extraData?.meetLink,
      date: extraData?.date,
    })

    const html = generateEmailHTML(body, leadEmail)

    await payload.sendEmail({
      to: leadEmail,
      subject,
      html,
    })

    // Update lead email history
    const currentEmails = lead.emailsSent || []
    currentEmails.push({
      subject,
      template: `${priority}-${emailType}`,
      sentAt: new Date().toISOString(),
      status: 'sent',
    })

    await payload.update({
      collection: 'leads',
      id: leadId,
      data: {
        emailsSent: currentEmails,
        followUpStatus: emailType === 'meeting' ? 'meeting_scheduled' : 'email_sent',
      } as Partial<Lead>,
    })

    return { success: true, message: `Email sent to ${leadEmail}` }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, message: 'Failed to send email', error: msg }
  }
}

// Send custom email
export async function sendCustomEmail(
  leadId: string,
  customSubject: string,
  customBody: string
): Promise<SendEmailResult> {
  try {
    const payload = await getPayload({ config: configPromise })

    const lead = await payload.findByID({
      collection: 'leads',
      id: leadId,
    }) as ExtendedLead

    if (!lead) {
      return { success: false, message: 'Lead not found' }
    }

    const leadName = lead.name
    const leadEmail = lead.email
    const leadCompany = lead.companyName || 'your company'

    const subject = customSubject
      .replace(/{{name}}/g, leadName)
      .replace(/{{companyName}}/g, leadCompany)

    const body = customBody
      .replace(/{{name}}/g, leadName)
      .replace(/{{companyName}}/g, leadCompany)

    const html = generateEmailHTML(body, leadEmail)

    await payload.sendEmail({
      to: leadEmail,
      subject,
      html,
    })

    const currentEmails = lead.emailsSent || []
    currentEmails.push({
      subject,
      template: 'custom',
      sentAt: new Date().toISOString(),
      status: 'sent',
    })

    await payload.update({
      collection: 'leads',
      id: leadId,
      data: {
        emailsSent: currentEmails,
        followUpStatus: 'email_sent',
      } as Partial<Lead>,
    })

    return { success: true, message: `Email sent to ${leadEmail}` }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, message: 'Failed to send email', error: msg }
  }
}

// Send email using a Payload email-templates document (e.g. for scheduled emails)
export async function sendTemplatedEmail(
  leadId: string,
  templateId: string
): Promise<boolean> {
  try {
    const payload = await getPayload({ config: configPromise })

    const lead = await payload.findByID({
      collection: 'leads',
      id: leadId,
    }) as ExtendedLead

    const template = await payload.findByID({
      collection: 'email-templates',
      id: templateId,
    }) as { subject: string; body: string } | null

    if (!lead || !template) {
      return false
    }

    const leadName = lead.name
    const leadEmail = lead.email
    const leadCompany = lead.companyName || 'your company'

    const subject = template.subject
      .replace(/{{name}}/g, leadName)
      .replace(/{{companyName}}/g, leadCompany)

    const body = template.body
      .replace(/{{name}}/g, leadName)
      .replace(/{{companyName}}/g, leadCompany)

    const html = generateEmailHTML(body, leadEmail)

    await payload.sendEmail({
      to: leadEmail,
      subject,
      html,
    })

    const currentEmails = lead.emailsSent || []
    currentEmails.push({
      subject,
      template: templateId,
      sentAt: new Date().toISOString(),
      status: 'sent',
    })

    await payload.update({
      collection: 'leads',
      id: leadId,
      data: {
        emailsSent: currentEmails,
        followUpStatus: 'email_sent',
      } as Partial<Lead>,
    })

    return true
  } catch {
    return false
  }
}

// Test email
export async function sendTestEmail(to: string): Promise<SendEmailResult> {
  try {
    const payload = await getPayload({ config: configPromise })

    const html = generateEmailHTML(
      'Hello!\n\nThis is a test email from Finideas.\n\nIf you receive this, email is working!\n\nBest regards,\nFinideas Team',
      to
    )

    await payload.sendEmail({
      to,
      subject: 'Finideas Test Email',
      html,
    })

    return { success: true, message: `Test email sent to ${to}` }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, message: 'Failed to send email', error: msg }
  }
}

/** Get default email template from Payload by priority and type (for scheduling). */
export async function getDefaultTemplate(
  priority: 'hot' | 'warm' | 'cold',
  type: 'initial' | 'followup' | 'meeting'
): Promise<{ id: string } | null> {
  try {
    const payload = await getPayload({ config: configPromise })
    const result = await payload.find({
      collection: 'email-templates',
      where: {
        and: [
          { priority: { equals: priority } },
          { type: { equals: type } },
        ],
      },
      limit: 1,
    })
    const doc = result.docs[0]
    return doc ? { id: doc.id } : null
  } catch {
    return null
  }
}