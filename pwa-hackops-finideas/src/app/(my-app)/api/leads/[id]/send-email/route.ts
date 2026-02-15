import { NextRequest, NextResponse } from 'next/server'
import { sendEmailToLead, sendCustomEmail } from '@/lib/emailService'
import { EmailType } from '@/lib/emailTemplates'
import { requireAuth } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth()
    if (!authResult.authenticated) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      )
    }

    const { id } = await params
    const body = await request.json()

    const {
      type,
      customSubject,
      customBody,
      meetLink,
      date,
    } = body as {
      type?: EmailType
      customSubject?: string
      customBody?: string
      meetLink?: string
      date?: string
    }

    let result

    // If custom subject & body provided, send custom email
    if (customSubject && customBody) {
      result = await sendCustomEmail(id, customSubject, customBody)
    } else {
      // Send templated email based on lead's priority
      const emailType: EmailType = type || 'initial'
      result = await sendEmailToLead(id, emailType, { meetLink, date })
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
      })
    } else {
      return NextResponse.json(
        { success: false, message: result.message, error: result.error },
        { status: 500 }
      )
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, message: 'Error sending email', error: errorMessage },
      { status: 500 }
    )
  }
}