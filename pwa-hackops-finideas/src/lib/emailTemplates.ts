export type Priority = 'hot' | 'warm' | 'cold'
export type EmailType = 'initial' | 'followup' | 'meeting'

interface TemplateData {
  name: string
  companyName: string
  meetLink?: string
  date?: string
}

interface EmailTemplate {
  subject: string
  body: string
}

// Replace placeholders in template
function replacePlaceholders(text: string, data: TemplateData): string {
  return text
    .replace(/{{name}}/g, data.name)
    .replace(/{{companyName}}/g, data.companyName || 'your company')
    .replace(/{{meetLink}}/g, data.meetLink || '')
    .replace(/{{date}}/g, data.date || '')
}

// HOT LEAD TEMPLATES
const hotTemplates: Record<EmailType, EmailTemplate> = {
  initial: {
    subject: '🔥 Great meeting you, {{name}}!',
    body: `Dear {{name}},

It was wonderful meeting you at the conference! I could sense your keen interest in our solutions.

At HackOps, we specialize in helping professionals like you achieve exceptional results.

I'd love to schedule a priority call with you this week. Would tomorrow or the day after work for a quick 15-minute call?

Looking forward to connecting soon!

Best regards,
HackOps Team`,
  },
  followup: {
    subject: '⚡ Quick follow-up, {{name}}!',
    body: `Dear {{name}},

I wanted to quickly follow up on our conversation at the conference.

I've been thinking about {{companyName}}'s needs, and I believe we have some exciting solutions that could be a perfect fit.

Just reply with your preferred time, and I'll send over a calendar invite.

Best regards,
HackOps Team`,
  },
  meeting: {
    subject: '📅 Your Meeting is Confirmed - {{name}}',
    body: `Dear {{name}},

Your meeting has been scheduled!

📅 Date & Time: {{date}}
🔗 Meeting Link: {{meetLink}}

How to Join:
1. Click the meeting link at the scheduled time
2. Allow camera & microphone access
3. Enter your name and join

Looking forward to our conversation!

Best regards,
HackOps Team`,
  },
}

// WARM LEAD TEMPLATES
const warmTemplates: Record<EmailType, EmailTemplate> = {
  initial: {
    subject: 'Nice connecting with you, {{name}}!',
    body: `Dear {{name}},

Thank you for stopping by our booth at the conference! It was great to meet you.

I wanted to share a bit more about how HackOps can help {{companyName}} achieve your goals.

Feel free to reply with a convenient time for a quick call.

Best regards,
HackOps Team`,
  },
  followup: {
    subject: 'Following up - HackOps Solutions',
    body: `Dear {{name}},

I hope you're having a great week! I wanted to follow up on our brief meeting at the conference.

Would you be open to a quick 15-minute call to explore if we're a good fit?

Looking forward to hearing from you!

Best regards,
HackOps Team`,
  },
  meeting: {
    subject: '📅 Your Meeting is Confirmed - {{name}}',
    body: `Dear {{name}},

Great news! Your meeting has been scheduled.

📅 Date & Time: {{date}}
🔗 Meeting Link: {{meetLink}}

How to Join:
Simply click the link above at the scheduled time. No account or download needed!

Best regards,
HackOps Team`,
  },
}

// COLD LEAD TEMPLATES
const coldTemplates: Record<EmailType, EmailTemplate> = {
  initial: {
    subject: 'Thanks for visiting us, {{name}}',
    body: `Dear {{name}},

Thank you for visiting our booth at the recent conference.

At HackOps, we help businesses like {{companyName}} with innovative solutions designed to drive growth.

If you'd like to learn more, feel free to reply to this email.

Best regards,
HackOps Team`,
  },
  followup: {
    subject: 'Still thinking about it? We are here to help',
    body: `Dear {{name}},

I wanted to check in and see if you've had any thoughts about exploring solutions for {{companyName}}.

No rush at all - whenever you're ready to chat, I'm just an email away.

Best regards,
HackOps Team`,
  },
  meeting: {
    subject: '📅 Your Meeting Details - {{name}}',
    body: `Dear {{name}},

Your meeting has been scheduled.

📅 Date & Time: {{date}}
🔗 Meeting Link: {{meetLink}}

This will be a casual, no-pressure conversation. Feel free to reach out if you have any questions.

Best regards,
HackOps Team`,
  },
}

// Template mapping
const templates: Record<Priority, Record<EmailType, EmailTemplate>> = {
  hot: hotTemplates,
  warm: warmTemplates,
  cold: coldTemplates,
}

// Get template by priority and type
export function getTemplate(priority: Priority, type: EmailType): EmailTemplate {
  return templates[priority][type]
}

// Get parsed template with data
export function getParsedTemplate(
  priority: Priority,
  type: EmailType,
  data: TemplateData
): { subject: string; body: string } {
  const template = getTemplate(priority, type)
  return {
    subject: replacePlaceholders(template.subject, data),
    body: replacePlaceholders(template.body, data),
  }
}

// Generate HTML email
export function generateEmailHTML(body: string, recipientEmail: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px;">🚀 HackOps</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <div style="color: #374151; font-size: 15px; line-height: 1.7;">
                ${body.replace(/\n/g, '<br>')}
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 13px;">
                HackOps - Lead Management System
              </p>
              <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 12px;">
                Sent to ${recipientEmail}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}