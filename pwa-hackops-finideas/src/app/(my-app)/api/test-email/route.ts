import { NextRequest, NextResponse } from 'next/server'
import { sendTestEmail } from '@/lib/emailService'
import { requireAdmin } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Only admins can send test emails
    const authResult = await requireAdmin()
    if (!authResult.authenticated) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      )
    }

    const body = await request.json()
    const { to } = body as { to: string }

    if (!to) {
      return NextResponse.json(
        { success: false, message: 'Email address (to) is required' },
        { status: 400 }
      )
    }

    const result = await sendTestEmail(to)

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
      { success: false, message: 'Error sending test email', error: errorMessage },
      { status: 500 }
    )
  }
}