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

At Finideas, we specialize in helping professionals like you achieve exceptional results.

I'd love to schedule a priority call with you this week. Would tomorrow or the day after work for a quick 15-minute call?

Looking forward to connecting soon!

Best regards,
Finideas Team`,
  },
  followup: {
    subject: '⚡ Quick follow-up, {{name}}!',
    body: `Dear {{name}},

I wanted to quickly follow up on our conversation at the conference.

I've been thinking about {{companyName}}'s needs, and I believe we have some exciting solutions that could be a perfect fit.

Just reply with your preferred time, and I'll send over a calendar invite.

Best regards,
Finideas Team`,
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
Finideas Team`,
  },
}

// WARM LEAD TEMPLATES
const warmTemplates: Record<EmailType, EmailTemplate> = {
  initial: {
    subject: 'Nice connecting with you, {{name}}!',
    body: `Dear {{name}},

Thank you for stopping by our booth at the conference! It was great to meet you.

I wanted to share a bit more about how Finideas can help {{companyName}} achieve your goals.

Feel free to reply with a convenient time for a quick call.

Best regards,
Finideas Team`,
  },
  followup: {
    subject: 'Following up - Finideas Solutions',
    body: `Dear {{name}},

I hope you're having a great week! I wanted to follow up on our brief meeting at the conference.

Would you be open to a quick 15-minute call to explore if we're a good fit?

Looking forward to hearing from you!

Best regards,
Finideas Team`,
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
Finideas Team`,
  },
}

// COLD LEAD TEMPLATES
const coldTemplates: Record<EmailType, EmailTemplate> = {
  initial: {
    subject: 'Thanks for visiting us, {{name}}',
    body: `Dear {{name}},

Thank you for visiting our booth at the recent conference.

At Finideas, we help businesses like {{companyName}} with innovative solutions designed to drive growth.

If you'd like to learn more, feel free to reply to this email.

Best regards,
Finideas Team`,
  },
  followup: {
    subject: 'Still thinking about it? We are here to help',
    body: `Dear {{name}},

I wanted to check in and see if you've had any thoughts about exploring solutions for {{companyName}}.

No rush at all - whenever you're ready to chat, I'm just an email away.

Best regards,
Finideas Team`,
  },
  meeting: {
    subject: '📅 Your Meeting Details - {{name}}',
    body: `Dear {{name}},

Your meeting has been scheduled.

📅 Date & Time: {{date}}
🔗 Meeting Link: {{meetLink}}

This will be a casual, no-pressure conversation. Feel free to reach out if you have any questions.

Best regards,
Finideas Team`,
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

export type TemplateInfo = { priority: Priority; type: EmailType; subject: string; body: string }

// Get all templates as a flat list (for API listing)
export function getAllTemplates(): TemplateInfo[] {
  const result: TemplateInfo[] = []
  const priorities: Priority[] = ['hot', 'warm', 'cold']
  const types: EmailType[] = ['initial', 'followup', 'meeting']
  for (const p of priorities) {
    for (const t of types) {
      const tmpl = templates[p][t]
      result.push({ priority: p, type: t, subject: tmpl.subject, body: tmpl.body })
    }
  }
  return result
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

// Generate HTML email – Finideas layout (header, body, footer – no social links)
export function generateEmailHTML(body: string, recipientEmail: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Finideas Official Mail</title>
</head>
<body style="margin:0; padding:0; background-color:#ffffff;">

<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff; font-family:Verdana, sans-serif;">

  <!-- HEADER -->
  <tr>
    <td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; background-color:#000000;">
        <tr>
          <td style="padding:16px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td valign="middle" style="color:#ffffff;">
                  <div style="font-size:20px; font-weight:bold;">
                    FINIDEAS
                  </div>
                  <div style="font-size:12px; color:#cccccc; letter-spacing:0.4px;">
                    INVESTMENT ADVISORY & CONFERENCE LEAD MANAGEMENT
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- BODY -->
  <tr>
    <td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
        <tr>
          <td style="padding:24px; font-size:14px; line-height:1.7; text-align:left; color:#222222;">
            ${body.replace(/\n/g, '<br>')}
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- FOOTER -->
  <tr>
    <td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; background-color:#000000;">
        <tr>
          <td style="padding:16px; text-align:center;">
            <div style="margin-top:8px; font-size:11px; color:#999999;">
              © Finideas. All rights reserved.
            </div>
            <div style="margin-top:4px; font-size:11px; color:#999999;">
              Sent to ${recipientEmail}
            </div>
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