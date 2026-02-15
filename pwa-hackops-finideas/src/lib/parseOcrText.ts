/**
 * Parse visiting-card OCR text and normalize phone for +91 / 91 / 0 etc.
 */

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi
// Match phone: +91, 91, 0 prefix, or 10-digit Indian mobile (6–9)
const PHONE_REGEX =
  /(?:\+91|91|0)?[\s\-.]*([6-9]\d{9})\b|(?:\+91|91)?[\s\-.]*(\d{2,4})[\s\-.]*(\d{2,4})[\s\-.]*(\d{2,9})/g

export interface ParsedOcrContact {
  name: string
  companyName: string
  contactNo: string
  email: string
}

/** Normalize mobile for India: +91 98765 43210, 91 9876543210, 09876543210, 9876543210 → +919876543210 */
export function normalizePhoneDisplay(phone: string): string {
  const raw = (phone || "").trim()
  let digits = raw.replace(/\D/g, "")
  if (digits.length === 0) return raw
  // Strip leading 0 (e.g. 09876543210)
  if (digits.startsWith("0") && digits.length > 10) digits = digits.slice(1)
  // Strip India country code 91 if present (e.g. 919876543210 or 91 9876543210)
  if (digits.length === 12 && digits.startsWith("91") && /^[6-9]/.test(digits.slice(2)))
    digits = digits.slice(2)
  if (digits.length === 11 && digits.startsWith("91")) digits = digits.slice(2)
  // Canonical: 10-digit Indian mobile
  if (digits.length >= 10 && /^[6-9]/.test(digits.slice(-10)))
    return `+91 ${digits.slice(-10).replace(/(\d{5})(\d{5})/, "$1 $2")}`
  if (digits.length >= 10) return `+${digits}`
  return raw
}

/** Extract first 10-digit Indian mobile from text, normalized for display */
function extractPhone(text: string): string {
  const trimmed = (text || "").trim()
  const matches = [...trimmed.matchAll(PHONE_REGEX)]
  for (const m of matches) {
    const part = (m[1] || (m[2] || "") + (m[3] || "") + (m[4] || "")).replace(/\D/g, "")
    if (part.length >= 10) {
      const digits = part.slice(-10)
      if (/^[6-9]/.test(digits)) return normalizePhoneDisplay(digits)
    }
  }
  const any = trimmed.match(/([6-9]\d{9})|(\d{10,})/)
  if (any) {
    const d = (any[1] || any[2] || "").replace(/\D/g, "")
    if (d.length >= 10) return normalizePhoneDisplay(d.slice(-10))
  }
  return ""
}

function extractEmail(text: string): string {
  const m = (text || "").match(EMAIL_REGEX)
  return m ? m[0].toLowerCase().trim() : ""
}

/** Parse OCR raw text into name, company, phone, email. Manual fields can override. */
export function parseOcrText(rawText: string): ParsedOcrContact {
  const trimmed = (rawText || "").trim()
  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  const email = extractEmail(trimmed)
  const contactNo = extractPhone(trimmed)
  const looksLikeEmail = (s: string) => /@/.test(s)
  const looksLikePhone = (s: string) => /^[\d+\-\s.()]+$/.test(s)
  const name =
    lines.find((l) => l.length >= 2 && !looksLikeEmail(l) && !looksLikePhone(l)) ||
    (lines[0] && lines[0].length >= 2 ? lines[0].slice(0, 100) : "") ||
    "Visiting Card"
  const companyName =
    lines.length >= 2
      ? (lines.find((l, i) => i >= 1 && l.length >= 2 && !looksLikeEmail(l) && l !== name) ||
          lines[1] ||
          "")
          .slice(0, 150)
      : ""

  return {
    name: name.slice(0, 100),
    companyName: companyName.trim(),
    contactNo: contactNo || "",
    email: email || "",
  }
}
