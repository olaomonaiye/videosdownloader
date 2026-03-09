import * as cron from 'node-cron';
import { spawn } from 'child_process';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const prisma = new PrismaClient();
const YTDLP_PATH = process.env.YTDLP_PATH || 'yt-dlp';

// ── yt-dlp Auto Update ──
async function updateYtDlp(): Promise<void> {
  console.log('[Cron] Checking for yt-dlp updates...');
  try {
    const proc = spawn(YTDLP_PATH, ['--update'], { timeout: 60000 });
    let output = '';
    proc.stdout.on('data', (d) => { output += d.toString(); });
    proc.stderr.on('data', (d) => { output += d.toString(); });
    proc.on('close', (code) => {
      console.log(`[Cron] yt-dlp update check: ${code === 0 ? 'OK' : 'Failed'} - ${output.trim().slice(0, 200)}`);
    });
  } catch (err: any) {
    console.error('[Cron] yt-dlp update failed:', err.message);
  }
}

// ── Platform Auto-Sync ──
async function syncPlatforms(): Promise<void> {
  console.log('[Cron] Syncing platforms from yt-dlp extractors...');
  try {
    const proc = spawn(YTDLP_PATH, ['--list-extractors'], { timeout: 30000 });
    let output = '';
    proc.stdout.on('data', (d) => { output += d.toString(); });
    proc.on('close', async (code) => {
      if (code !== 0) return;
      const extractors = output.split('\n').filter(e => e.trim() && !e.startsWith('generic'));
      let newCount = 0;
      for (const ext of extractors.slice(0, 500)) {
        const name = ext.trim();
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        if (!slug || slug.length < 2) continue;
        const exists = await prisma.platform.findUnique({ where: { slug } });
        if (!exists) {
          await prisma.platform.create({
            data: { name, slug, extractorKey: name, isActive: false, isAutoDiscovered: true },
          });
          newCount++;
        }
      }
      if (newCount > 0) console.log(`[Cron] Discovered ${newCount} new platforms`);
    });
  } catch (err: any) {
    console.error('[Cron] Platform sync failed:', err.message);
  }
}

// ── Schedule Jobs ──
const updateCron = process.env.YTDLP_UPDATE_CRON || '0 3 * * *';
const autoUpdate = process.env.YTDLP_AUTO_UPDATE !== 'false';

if (autoUpdate) {
  cron.schedule(updateCron, updateYtDlp);
  console.log(`[Cron] yt-dlp auto-update scheduled: ${updateCron}`);
}

// Weekly platform sync (Sundays at 4 AM)
cron.schedule('0 4 * * 0', syncPlatforms);
console.log('[Cron] Platform sync scheduled: Sundays 4:00 AM');

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

console.log('⏰ Cron runner started');
