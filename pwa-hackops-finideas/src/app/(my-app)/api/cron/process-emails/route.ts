import { NextResponse } from 'next/server'
import { processScheduledEmails } from '@/lib/scheduledEmailProcessor'

// Allow manual trigger via GET (e.g., external CRON service, curl, browser)
export async function GET() {
  try {
    await processScheduledEmails()
    return NextResponse.json({ success: true, message: 'Scheduled emails processed' })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, message: 'Failed to process scheduled emails', error: msg },
      { status: 500 },
    )
  }
}
