import { FastifyInstance } from 'fastify';
import { spawn } from 'child_process';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import prisma from '../../config/database';
import { env } from '../../config/env';
import { downloadAnalyzeSchema, downloadInitiateSchema } from '../../common/schemas';
import { sendSuccess, sendError } from '../../common/response';
import { ValidationError, NotFoundError } from '../../common/errors';
import { hashIP, getClientIP } from '../../common/utils';

// Brand suffix for downloaded filenames
const BRAND_SUFFIX = 'Videos Downloader videosdownloader.app';
const CONTACT_LINE = 'If this issue persists, please contact us at reports@videosdownloader.app';

// Common yt-dlp flags for maximum compatibility across platforms
const COMMON_YTDLP_FLAGS = [
  '--no-playlist',
  '--no-warnings',
  '--no-check-certificates',
  '--extractor-retries', '3',
  '--socket-timeout', '30',
];

// Platform detection from URL
const PLATFORM_PATTERNS: Record<string, RegExp> = {
  youtube: /(?:youtube\.com|youtu\.be)/i,
  instagram: /instagram\.com/i,
  tiktok: /tiktok\.com/i,
  facebook: /(?:facebook\.com|fb\.watch)/i,
  twitter: /(?:twitter\.com|x\.com)/i,
  vimeo: /vimeo\.com/i,
  dailymotion: /dailymotion\.com/i,
  twitch: /twitch\.tv/i,
  reddit: /(?:reddit\.com|v\.redd\.it)/i,
  pinterest: /pinterest\.com/i,
  soundcloud: /soundcloud\.com/i,
  bilibili: /bilibili\.com/i,
  rumble: /rumble\.com/i,
  linkedin: /linkedin\.com/i,
  snapchat: /snapchat\.com/i,
  bandcamp: /bandcamp\.com/i,
  audiomack: /audiomack\.com/i,
  mixcloud: /mixcloud\.com/i,
  likee: /likee\.video/i,
  triller: /triller\.co/i,
  streamable: /streamable\.com/i,
  bitchute: /bitchute\.com/i,
  odysee: /odysee\.com/i,
};

function detectPlatform(url: string): string | null {
  for (const [slug, pattern] of Object.entries(PLATFORM_PATTERNS)) {
    if (pattern.test(url)) return slug;
  }
  return null;
}

// Block private/internal IPs (SSRF prevention)
function isPrivateUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    const privatePatterns = [
      /^localhost$/i, /^127\./, /^10\./, /^172\.(1[6-9]|2\d|3[0-1])\./, /^192\.168\./,
      /^0\.0\.0\.0$/, /^::1$/, /^fc00:/i, /^fe80:/i, /^169\.254\./,
    ];
    return privatePatterns.some(p => p.test(hostname));
  } catch {
    return true;
  }
}

// Run yt-dlp and return stdout/stderr
function runYtDlp(args: string[], timeoutMs = 30000): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(env.YTDLP_PATH, args, {
      env: { ...process.env },
      timeout: timeoutMs,
    });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr || `yt-dlp exited with code ${code}`));
    });
    proc.on('error', reject);
  });
}

// Detect video codec of a file using ffprobe
function getVideoCodec(filePath: string): Promise<string> {
  return new Promise((resolve) => {
    const proc = spawn('ffprobe', [
      '-v', 'quiet', '-select_streams', 'v:0',
      '-show_entries', 'stream=codec_name',
      '-of', 'csv=p=0', filePath,
    ], { timeout: 10000 });
    let out = '';
    proc.stdout.on('data', (d) => { out += d.toString(); });
    proc.on('close', () => resolve(out.trim().replace(/,/g, '').split('\n')[0] || ''));
    proc.on('error', () => resolve(''));
  });
}

// Codecs that don't play in MP4 on most devices (QuickTime, iPhone, Windows Media Player)
const INCOMPATIBLE_MP4_CODECS = new Set(['vp9', 'vp8', 'av1']);

// Transcode video to H264+AAC for universal playback
function transcodeToH264(input: string, output: string, timeoutMs = 300000): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', [
      '-i', input,
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
      '-c:a', 'aac', '-b:a', '128k',
      '-movflags', '+faststart',
      '-y', output,
    ], { timeout: timeoutMs });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg transcode exited with code ${code}`));
    });
    proc.on('error', reject);
  });
}

// Format human-readable filesize
function formatFileSize(bytes: number | null | undefined): string | null {
  if (!bytes || bytes <= 0) return null;
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

// Format duration to mm:ss or hh:mm:ss
function formatDuration(seconds: number | null | undefined): string | null {
  if (!seconds || seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Extract resolution height from format info
function getResolutionHeight(f: any): number {
  if (f.height) return f.height;
  const match = (f.resolution || f.format_note || '').match(/(\d+)p/);
  return match ? parseInt(match[1]) : 0;
}

// Determine if a format has both video and audio
function isCombinedFormat(f: any): boolean {
  const hasVideo = f.vcodec && f.vcodec !== 'none';
  const hasAudio = f.acodec && f.acodec !== 'none';
  return hasVideo && hasAudio;
}

// Smart format filtering per PRD 5.2
function filterAndSortFormats(formats: any[]): any[] {
  if (!formats || !Array.isArray(formats)) return [];

  const seen = new Set<string>();
  const videoFormats: any[] = [];
  const audioFormats: any[] = [];

  for (const f of formats) {
    const hasVideo = f.vcodec && f.vcodec !== 'none';
    const hasAudio = f.acodec && f.acodec !== 'none';
    const ext = (f.ext || '').toLowerCase();
    const height = getResolutionHeight(f);
    const filesize = f.filesize || f.filesize_approx || null;

    // Skip manifest/storyboard/mhtml formats
    if (['mhtml', 'json'].includes(ext)) continue;
    if (f.protocol === 'mhtml' || f.format_note === 'storyboard') continue;

    // Combined video+audio (preferred)
    if (hasVideo && hasAudio) {
      const key = `combined-${ext}-${height}`;
      if (seen.has(key)) continue;
      seen.add(key);

      videoFormats.push({
        format_id: f.format_id,
        ext,
        resolution: height ? `${height}p` : f.format_note || 'Unknown',
        height,
        filesize,
        filesize_display: formatFileSize(filesize),
        fps: f.fps || null,
        vcodec: f.vcodec,
        acodec: f.acodec,
        type: 'video',
        needsMerge: false,
      });
    }
    // Video-only (DASH) — will be merged with best audio on download
    else if (hasVideo && !hasAudio) {
      const key = `video-${ext}-${height}`;
      if (seen.has(key)) continue;
      seen.add(key);

      videoFormats.push({
        format_id: f.format_id,
        ext: 'mp4', // will be merged to mp4
        resolution: height ? `${height}p` : f.format_note || 'Unknown',
        height,
        filesize,
        filesize_display: formatFileSize(filesize),
        fps: f.fps || null,
        vcodec: f.vcodec,
        acodec: 'merged',
        type: 'video',
        needsMerge: true,
      });
    }
    // Audio-only
    else if (hasAudio && !hasVideo) {
      const abr = f.abr || f.tbr || 0;
      const aKey = `${ext}-audio-${Math.round(abr)}`;
      if (seen.has(aKey)) continue;
      seen.add(aKey);

      audioFormats.push({
        format_id: f.format_id,
        ext,
        resolution: f.format_note || `${Math.round(abr)}kbps` || 'Audio',
        height: 0,
        filesize,
        filesize_display: formatFileSize(filesize),
        fps: null,
        vcodec: null,
        acodec: f.acodec,
        type: 'audio',
        abr: Math.round(abr),
        needsMerge: false,
      });
    }
  }

  // Sort video by height descending, audio by bitrate descending
  videoFormats.sort((a, b) => b.height - a.height);
  audioFormats.sort((a, b) => (b.abr || 0) - (a.abr || 0));

  // Deduplicate: prefer combined over video-only at same resolution
  const deduped: any[] = [];
  const seenHeights = new Set<number>();
  for (const v of videoFormats) {
    if (seenHeights.has(v.height)) continue;
    seenHeights.add(v.height);
    deduped.push(v);
  }

  return [...deduped, ...audioFormats];
}

// Sanitize filename for Content-Disposition
function sanitizeFilename(name: string): string {
  return name.replace(/[^\w\s\-().]/g, '').replace(/\s+/g, ' ').trim().slice(0, 200) || 'download';
}

// Map user-friendly error from yt-dlp stderr
function mapYtdlpError(stderr: string): string {
  const msg = (stderr || '').toLowerCase();
  if (msg.includes('geo') || msg.includes('country')) {
    return 'This video is geo-restricted and cannot be downloaded from your location.';
  } else if (msg.includes('private') || msg.includes('login') || msg.includes('sign in')) {
    return 'This video is private or requires authentication to access.';
  } else if (msg.includes('age') || msg.includes('confirm your age')) {
    return 'This video is age-restricted and cannot be downloaded.';
  } else if (msg.includes('drm') || msg.includes('protected')) {
    return 'This video is DRM-protected and cannot be downloaded.';
  } else if (msg.includes('not found') || msg.includes('404') || msg.includes('unavailable') || msg.includes('does not exist') || msg.includes('been removed')) {
    return 'This video was not found. It may have been removed or the URL is incorrect.';
  } else if (msg.includes('unsupported') || msg.includes('no suitable')) {
    return 'This URL is not supported or no downloadable media was found.';
  }
  return 'This video cannot be downloaded. Please check the URL and try again.';
}

export async function downloadRoutes(app: FastifyInstance): Promise<void> {

  // POST /api/v1/downloads/analyze — SYNCHRONOUS (no queue)
  app.post('/analyze', {
    config: { rateLimit: { max: env.RATE_LIMIT_DOWNLOAD, timeWindow: env.RATE_LIMIT_WINDOW_MS } },
  }, async (request, reply) => {
    const { url } = downloadAnalyzeSchema.parse(request.body);

    if (isPrivateUrl(url)) {
      throw new ValidationError('Invalid URL: private addresses not allowed');
    }

    const platformSlug = detectPlatform(url);
    let platform = null;
    if (platformSlug) {
      platform = await prisma.platform.findUnique({
        where: { slug: platformSlug },
        select: { id: true, name: true, slug: true, logoUrl: true },
      });
    }

    try {
      const { stdout } = await runYtDlp([
        '--dump-json',
        '--no-download',
        ...COMMON_YTDLP_FLAGS,
        url,
      ], 45000);

      const info = JSON.parse(stdout);
      const formats = filterAndSortFormats(info.formats || []);

      // Track analytics
      await prisma.analyticsEvent.create({
        data: {
          eventType: 'DOWNLOAD_INITIATED',
          platformId: platform?.id,
          ipHash: hashIP(getClientIP(request)),
          userAgent: request.headers['user-agent'] || null,
          metadata: { url, title: info.title },
        },
      }).catch(() => {});

      sendSuccess(reply, {
        title: info.title || 'Untitled Video',
        thumbnail: info.thumbnail || null,
        duration: info.duration || null,
        duration_display: formatDuration(info.duration),
        uploader: info.uploader || info.channel || null,
        formats,
        url,
        platform: platform ? { name: platform.name, slug: platform.slug, logoUrl: platform.logoUrl } : null,
      });
    } catch (err: any) {
      const userMessage = mapYtdlpError(err.message || '');
      reply.code(422).send({
        success: false,
        error: { message: `${userMessage}\n\n${CONTACT_LINE}`, code: 'ANALYSIS_FAILED' },
      });
    }
  });

  // POST /api/v1/downloads/initiate — ALWAYS returns a stream URL (never direct CDN URLs)
  // CDN URLs from platforms like TikTok, Instagram etc are origin-locked and won't work
  // from the browser. ALL downloads must be proxied through our server.
  app.post('/initiate', {
    config: { rateLimit: { max: env.RATE_LIMIT_DOWNLOAD, timeWindow: env.RATE_LIMIT_WINDOW_MS } },
  }, async (request, reply) => {
    const { url, format, title: reqTitle, needsMerge, type: formatType } = downloadInitiateSchema.parse(request.body);

    if (isPrivateUrl(url)) {
      throw new ValidationError('Invalid URL');
    }

    const platformSlug = detectPlatform(url);
    let platform = null;
    if (platformSlug) {
      platform = await prisma.platform.findUnique({ where: { slug: platformSlug } });
    }

    try {
      const title = sanitizeFilename(reqTitle || 'download');

      // Track download
      const download = await prisma.download.create({
        data: {
          url,
          platformId: platform?.id,
          format: format || 'best',
          status: 'COMPLETED',
          title,
          ipHash: hashIP(getClientIP(request)),
          userAgent: request.headers['user-agent'] || null,
          completedAt: new Date(),
        },
      }).catch(() => null);

      // Increment platform download count
      if (platform) {
        await prisma.platform.update({
          where: { id: platform.id },
          data: { downloadCount: { increment: 1 } },
        }).catch(() => {});
      }

      // ALWAYS stream through our server — CDN URLs are origin-locked
      const mergeFlag = needsMerge ? '1' : '0';
      const typeFlag = formatType || 'video';
      const streamUrl = `/api/v1/downloads/stream?url=${encodeURIComponent(url)}&format=${encodeURIComponent(format || 'best')}&title=${encodeURIComponent(title)}&needsMerge=${mergeFlag}&type=${typeFlag}`;
      const backendUrl = `http://localhost:${env.API_PORT}`;
      sendSuccess(reply, {
        downloadUrl: `${backendUrl}${streamUrl}`,
        title,
        downloadId: download?.id || null,
        useStream: true,
      });
    } catch (err: any) {
      reply.code(422).send({
        success: false,
        error: { message: `Failed to prepare download. Please try again.\n\n${CONTACT_LINE}`, code: 'DOWNLOAD_FAILED' },
      });
    }
  });

  // GET /api/v1/downloads/stream — downloads file via yt-dlp and streams to client
  // This is the core download endpoint. ALL downloads go through here to avoid
  // CDN origin restrictions and ensure consistent video+audio output.
  app.get('/stream', {
    config: { rateLimit: { max: env.RATE_LIMIT_DOWNLOAD, timeWindow: env.RATE_LIMIT_WINDOW_MS } },
  }, async (request, reply) => {
    const { url, format, title, needsMerge, type: formatType } = request.query as { url?: string; format?: string; title?: string; needsMerge?: string; type?: string };

    if (!url) throw new ValidationError('URL is required');

    try {
      new URL(url);
    } catch {
      throw new ValidationError('Invalid URL');
    }

    if (isPrivateUrl(url)) {
      throw new ValidationError('Invalid URL');
    }

    const safeName = sanitizeFilename(title || 'download');
    const brandedName = `${safeName} - [${BRAND_SUFFIX}]`;
    const formatId = format || 'best';

    // Always download to temp file first for reliability.
    // This ensures yt-dlp handles all format merging, codec negotiation,
    // and HTTP session management (cookies, referrers, etc.) properly.
    const tmpDir = os.tmpdir();
    const tmpBase = `dl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    // Use %(ext)s so yt-dlp picks the correct extension
    const tmpTemplate = path.join(tmpDir, `${tmpBase}.%(ext)s`);

    // Build yt-dlp args — smart format selection based on format type:
    // - Combined formats (needsMerge=false): use formatId alone. Adding +ba strips the video.
    // - Video-only DASH formats (needsMerge=true): use formatId+ba to merge best audio.
    // - Audio-only: use formatId alone.
    const wantsMerge = needsMerge === '1';
    const isAudio = formatType === 'audio';
    let formatSpec: string;
    if (formatId === 'best') {
      // Prefer H264+AAC (universally playable), fall back to any codec
      formatSpec = 'bv[vcodec^=avc1]+ba[acodec^=mp4a]/bv*+ba/b';
    } else if (isAudio) {
      formatSpec = `${formatId}/ba/b`;
    } else if (wantsMerge) {
      // Video-only format: must merge with best audio
      formatSpec = `${formatId}+ba/${formatId}/bv*+ba/b`;
    } else {
      // Combined format: use as-is, do NOT add +ba
      formatSpec = `${formatId}/${formatId}+ba/bv*+ba/b`;
    }

    const ytdlpArgs = [
      '-f', formatSpec,
      '--merge-output-format', 'mp4',
      '-o', tmpTemplate,
      ...COMMON_YTDLP_FLAGS,
      '--force-overwrites',
      url,
    ];

    try {
      await runYtDlp(ytdlpArgs, 180000); // 3 minutes max

      // Find the output file (yt-dlp may have changed the extension)
      const files = fs.readdirSync(tmpDir).filter(f => f.startsWith(tmpBase));
      if (files.length === 0) throw new Error('Download produced no output file');
      let finalFile = path.join(tmpDir, files[0]);
      let finalExt = path.extname(files[0]).slice(1) || 'mp4';

      // Check if video codec is incompatible with MP4 playback (VP9, VP8, AV1)
      // These codecs show as "audio only" on most players (QuickTime, iPhone, Windows)
      if (!isAudio) {
        const videoCodec = await getVideoCodec(finalFile);
        if (videoCodec && INCOMPATIBLE_MP4_CODECS.has(videoCodec)) {
          const transcodedFile = finalFile.replace(/\.[^.]+$/, '_h264.mp4');
          await transcodeToH264(finalFile, transcodedFile);
          fs.unlinkSync(finalFile);
          finalFile = transcodedFile;
          finalExt = 'mp4';
        }
      }

      const stat = fs.statSync(finalFile);
      const contentType = finalExt === 'mp3' || finalExt === 'opus' || finalExt === 'ogg' || finalExt === 'm4a'
        ? 'audio/mpeg'
        : 'video/mp4';

      const origin = request.headers.origin || '';
      const allowedOrigins = env.CORS_ORIGIN.split(',').map(o => o.trim());
      const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

      reply.raw.writeHead(200, {
        'Content-Disposition': `attachment; filename="${brandedName}.${finalExt}"`,
        'Content-Type': contentType,
        'Content-Length': stat.size,
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Expose-Headers': 'Content-Length, Content-Disposition',
      });

      const readStream = fs.createReadStream(finalFile);
      readStream.pipe(reply.raw);
      readStream.on('end', () => {
        fs.unlink(finalFile, () => {});
      });
      readStream.on('error', () => {
        fs.unlink(finalFile, () => {});
        if (!reply.raw.writableEnded) reply.raw.end();
      });
    } catch (err: any) {
      // Clean up any partial/transcoded files
      try {
        const leftover = fs.readdirSync(tmpDir).filter(f => f.startsWith(tmpBase));
        leftover.forEach(f => fs.unlink(path.join(tmpDir, f), () => {}));
      } catch {}

      if (!reply.raw.headersSent) {
        reply.code(500).send({
          success: false,
          error: { message: `Download failed. Please try again.\n\n${CONTACT_LINE}` },
        });
      }
    }
  });

  // GET /api/v1/downloads/:id/status
  app.get('/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string };
    const download = await prisma.download.findUnique({
      where: { id },
      select: {
        id: true, status: true, title: true, format: true,
        errorMessage: true, processingTimeMs: true, fileSize: true,
        createdAt: true, completedAt: true,
        platform: { select: { name: true, slug: true } },
      },
    });

    if (!download) throw new NotFoundError('Download');
    sendSuccess(reply, download);
  });
}
