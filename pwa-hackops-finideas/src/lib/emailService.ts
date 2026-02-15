import { getPayload } from 'payload'
import configPromise from '../payload.config'
import { Priority, EmailType, getParsedTemplate, generateEmailHTML } from './emailTemplates'

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
      } as any, // Type assertion needed until types are regenerated
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
      } as any, // Type assertion needed until types are regenerated
    })

    return { success: true, message: `Email sent to ${leadEmail}` }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, message: 'Failed to send email', error: msg }
  }
}

// Test email
export async function sendTestEmail(to: string): Promise<SendEmailResult> {
  try {
    const payload = await getPayload({ config: configPromise })

    const html = generateEmailHTML(
      'Hello!\n\nThis is a test email from HackOps.\n\nIf you receive this, email is working!\n\nBest regards,\nHackOps Team',
      to
    )

    await payload.sendEmail({
      to,
      subject: '✅ HackOps Test Email',
      html,
    })

    return { success: true, message: `Test email sent to ${to}` }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, message: 'Failed to send email', error: msg }
  }
}