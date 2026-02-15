/**
 * Next.js Instrumentation — runs once when the server starts.
 * We use it to kick off the scheduled-email polling interval so that
 * emails are automatically sent at their scheduled times without
 * needing a separate cron process.
 */

export async function register() {
  // Only run on the server (Node.js runtime), not during build or in Edge
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Dynamically import to avoid pulling Payload into the client bundle
    const { processScheduledEmails } = await import('@/lib/scheduledEmailProcessor')

    const INTERVAL_MS = 60 * 1000 // every 60 seconds

    console.log('[Instrumentation] Starting scheduled-email processor (every 60 s)')

    // First run immediately on startup
    setTimeout(async () => {
      try {
        await processScheduledEmails()
      } catch (e) {
        console.error('[Instrumentation] Initial scheduled-email run failed:', e)
      }
    }, 5000) // 5 s delay so Payload is fully ready

    // Then repeat every minute
    setInterval(async () => {
      try {
        await processScheduledEmails()
      } catch (e) {
        console.error('[Instrumentation] Scheduled-email run failed:', e)
      }
    }, INTERVAL_MS)
  }
}
