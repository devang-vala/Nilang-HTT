import cron from 'node-cron';
import { processScheduledEmails } from '../src/lib/scheduledEmailProcessor';

// Run every minute
cron.schedule('* * * * *', async () => {
  console.log('[CRON] Running scheduled email processor...');
  await processScheduledEmails();
});

// Keep process alive
setInterval(() => {}, 1000 * 60 * 60); // 1 hour
