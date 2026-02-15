import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '../../../../../payload.config'
import { requireAuth } from '@/lib/auth'

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const PHONE_REGEX = /(?:\+91|91|0)?[\s\-.]*([6-9]\d{9})\b|(?:\+91|91)?[\s\-.]*(\d{2,4})[\s\-.]*(\d{2,4})[\s\-.]*(\d{2,9})/g

/** Normalize for MongoDB: +91, 91, 0 prefix → canonical +<10 digits> for Indian mobile */
function normalizePhoneForDb(phone: string): string {
  let digits = (phone || '').replace(/\D/g, '')
  if (digits.startsWith('0') && digits.length > 10) digits = digits.slice(1)
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2)
  if (digits.length === 11 && digits.startsWith('91')) digits = digits.slice(2)
  if (digits.length >= 10 && /^[6-9]/.test(digits.slice(-10)))
    return `+${digits.slice(-10)}`
  return digits.length >= 10 ? `+${digits}` : phone?.trim() || '0-0-0'
}

function extractPhoneFromText(text: string): string {
  const matches = [...(text || '').matchAll(PHONE_REGEX)]
  for (const m of matches) {
    const part = (m[1] || (m[2] || '') + (m[3] || '') + (m[4] || '')).replace(/\D/g, '')
    if (part.length >= 10) return normalizePhoneForDb(part)
  }
  const any = (text || '').match(/([6-9]\d{9})|(\d{10,})/)
  if (any) return normalizePhoneForDb(any[1] || any[2] || '')
  return ''
}

function parseOCRText(rawText: string): {
  name: string
  companyName: string
  contactNo: string
  email: string
} {
  const trimmed = (rawText || '').trim()
  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  const looksLikeEmail = (s: string) => /@/.test(s)
  const looksLikePhone = (s: string) => /^[\d+\-\s.()]+$/.test(s)

  const email = (trimmed.match(EMAIL_REGEX) || [])[0]?.toLowerCase().trim() || 'noreply@ocr.local'
  const contactNo = extractPhoneFromText(trimmed) || '0-0-0'
  const name =
    lines.find((l) => l.length >= 2 && !looksLikeEmail(l) && !looksLikePhone(l)) ||
    (lines[0]?.slice(0, 100) || 'Visiting Card')
  const companyName = (
    lines.find((l, i) => i >= 1 && l.length >= 2 && !looksLikeEmail(l) && l !== name) ||
    lines[1] ||
    ''
  ).slice(0, 150).trim()

  return { name, companyName, contactNo, email }
}

// POST - Create or update lead from OCR (deduplicate by phone in MongoDB)
export async function POST(request: NextRequest) {
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
    const payload = await getPayload({ config })
    const body = await request.json()
    const rawText = typeof body.rawText === 'string' ? body.rawText : ''
    const localId = typeof body.localId === 'string' ? body.localId : undefined

    const parsed = parseOCRText(rawText)
    const contactNoCanonical = normalizePhoneForDb(parsed.contactNo)

    const existing = await payload.find({
      collection: 'leads',
      where: { contactNo: { equals: contactNoCanonical } },
      limit: 1,
    })

    const leadData = {
      name: parsed.name,
      companyName: parsed.companyName || undefined,
      contactNo: contactNoCanonical,
      email: parsed.email,
      tags: 'warm' as const,
      ocrRawText: rawText.slice(0, 5000) || undefined,
    }

    let lead
    if (existing.docs.length > 0) {
      const existingLead = existing.docs[0]
      lead = await payload.update({
        collection: 'leads',
        id: existingLead.id,
        data: {
          ...leadData,
          name: parsed.name || existingLead.name,
          companyName: parsed.companyName || existingLead.companyName || undefined,
          email: parsed.email !== 'noreply@ocr.local' ? parsed.email : existingLead.email,
        },
      })
    } else {
      lead = await payload.create({
        collection: 'leads',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: { ...leadData, createdBy: currentUser.id } as any,
        overrideAccess: true,
      })
    }

    return NextResponse.json(
      {
        success: true,
        message: 'OCR lead created',
        data: {
          id: lead.id,
          name: lead.name,
          companyName: lead.companyName,
          contactNo: lead.contactNo,
          email: lead.email,
          tags: lead.tags,
          createdAt: lead.createdAt,
          updatedAt: lead.updatedAt,
        },
        localId,
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to create OCR lead',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
