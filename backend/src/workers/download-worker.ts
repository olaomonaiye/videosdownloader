import { Worker, Job } from 'bullmq';
import { spawn } from 'child_process';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });

const YTDLP_PATH = process.env.YTDLP_PATH || 'yt-dlp';
const YTDLP_TIMEOUT = parseInt(process.env.YTDLP_TIMEOUT || '120000', 10);
const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '5', 10);

interface AnalyzeJobData {
  url: string;
  platformSlug: string | null;
  platformId: string | null;
  ipHash: string;
}

interface DownloadJobData {
  downloadId: string;
  url: string;
  format?: string;
  quality?: string;
  platformSlug: string | null;
  platformId: string | null;
}

function runYtDlp(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(YTDLP_PATH, args, { timeout: YTDLP_TIMEOUT, env: { ...process.env } });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      resolve({ stdout, stderr, exitCode: code || 0 });
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn yt-dlp: ${err.message}`));
    });
  });
}

async function processAnalyze(job: Job<AnalyzeJobData>): Promise<any> {
  const { url } = job.data;

  console.log(`[Worker] Analyzing: ${url}`);

  const result = await runYtDlp([
    '--dump-json',
    '--no-download',
    '--no-playlist',
    url,
  ]);

  if (result.exitCode !== 0) {
    throw new Error(`yt-dlp analysis failed: ${result.stderr.slice(0, 500)}`);
  }

  const info = JSON.parse(result.stdout);

  // Extract available formats
  const formats = (info.formats || []).map((f: any) => ({
    formatId: f.format_id,
    ext: f.ext,
    resolution: f.resolution || f.format_note || 'unknown',
    filesize: f.filesize || f.filesize_approx || null,
    vcodec: f.vcodec,
    acodec: f.acodec,
    fps: f.fps,
    quality: f.quality,
  })).filter((f: any) => f.ext && f.resolution);

  return {
    title: info.title,
    description: info.description?.slice(0, 500),
    thumbnail: info.thumbnail,
    duration: info.duration,
    uploader: info.uploader,
    viewCount: info.view_count,
    formats,
  };
}

async function processDownload(job: Job<DownloadJobData>): Promise<any> {
  const { downloadId, url, format, quality } = job.data;
  const startTime = Date.now();

  console.log(`[Worker] Downloading: ${url} (ID: ${downloadId})`);

  // Update status to PROCESSING
  await prisma.download.update({
    where: { id: downloadId },
    data: { status: 'PROCESSING' },
  });

  try {
    const args = [
      '--dump-json',
      '--no-playlist',
      url,
    ];

    if (format) {
      args.push('-f', format);
    } else if (quality) {
      // Map quality to yt-dlp format string
      const qualityMap: Record<string, string> = {
        'best': 'bestvideo+bestaudio/best',
        '1080p': 'bestvideo[height<=1080]+bestaudio/best[height<=1080]',
        '720p': 'bestvideo[height<=720]+bestaudio/best[height<=720]',
        '480p': 'bestvideo[height<=480]+bestaudio/best[height<=480]',
        '360p': 'bestvideo[height<=360]+bestaudio/best[height<=360]',
        'audio': 'bestaudio/best',
      };
      args.push('-f', qualityMap[quality] || 'best');
    }

    const result = await runYtDlp(args);

    if (result.exitCode !== 0) {
      throw new Error(`Download failed: ${result.stderr.slice(0, 500)}`);
    }

    const info = JSON.parse(result.stdout);
    const processingTime = Date.now() - startTime;

    // Update download record
    await prisma.download.update({
      where: { id: downloadId },
      data: {
        status: 'COMPLETED',
        title: info.title,
        processingTimeMs: processingTime,
        fileSize: info.filesize || info.filesize_approx ? BigInt(info.filesize || info.filesize_approx) : null,
        completedAt: new Date(),
      },
    });

    // Increment platform download count
    if (job.data.platformId) {
      await prisma.platform.update({
        where: { id: job.data.platformId },
        data: { downloadCount: { increment: 1 } },
      });
    }

    // Track analytics
    await prisma.analyticsEvent.create({
      data: {
        eventType: 'DOWNLOAD_COMPLETED',
        platformId: job.data.platformId,
        ipHash: '',
        metadata: { downloadId, format, processingTimeMs: processingTime },
      },
    });

    return { success: true, title: info.title, downloadId };

  } catch (error: any) {
    const processingTime = Date.now() - startTime;

    await prisma.download.update({
      where: { id: downloadId },
      data: {
        status: 'FAILED',
        errorMessage: error.message?.slice(0, 500),
        processingTimeMs: processingTime,
      },
    });

    await prisma.analyticsEvent.create({
      data: {
        eventType: 'DOWNLOAD_FAILED',
        platformId: job.data.platformId,
        ipHash: '',
        metadata: { downloadId, error: error.message?.slice(0, 200) },
      },
    });

    throw error;
  }
}

// ── Start Worker ──
const worker = new Worker(
  'downloads',
  async (job: Job) => {
    if (job.name === 'analyze') {
      return processAnalyze(job);
    } else if (job.name === 'download') {
      return processDownload(job);
    }
    throw new Error(`Unknown job type: ${job.name}`);
  },
  {
    connection: redis,
    concurrency: CONCURRENCY,
    limiter: {
      max: 10,
      duration: 1000,
    },
  }
);

worker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} (${job.name}) completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} (${job?.name}) failed:`, err.message);
});

worker.on('error', (err) => {
  console.error('[Worker] Error:', err.message);
});

// Graceful shutdown
async function shutdown() {
  console.log('[Worker] Shutting down gracefully...');
  await worker.close();
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

console.log(`🔧 Download worker started (concurrency: ${CONCURRENCY})`);
