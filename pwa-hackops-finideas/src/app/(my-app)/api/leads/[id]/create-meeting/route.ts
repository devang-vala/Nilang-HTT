import { NextRequest, NextResponse } from 'next/server'
import { createInstantMeeting, createScheduledMeeting } from '@/lib/jitsiService'
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
      scheduledAt,
      duration,
      sendInvite = true,
      instant = false,
    } = body as {
      scheduledAt?: string
      duration?: number
      sendInvite?: boolean
      instant?: boolean
    }

    let result

    if (instant) {
      // Create instant meeting
      result = await createInstantMeeting(id, sendInvite)
    } else {
      // Create scheduled meeting
      if (!scheduledAt) {
        return NextResponse.json(
          { success: false, message: 'scheduledAt is required for scheduled meetings' },
          { status: 400 }
        )
      }

      result = await createScheduledMeeting({
        leadId: id,
        scheduledAt,
        duration: duration || 30,
        sendInvite,
      })
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        data: result.data,
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
      { success: false, message: 'Error creating meeting', error: errorMessage },
      { status: 500 }
    )
  }
}