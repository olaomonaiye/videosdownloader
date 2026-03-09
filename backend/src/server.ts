import Fastify from 'fastify';
import { env } from './config/env';
import prisma from './config/database';
import { getRedis } from './config/redis';
import { registerPlugins } from './plugins';
import { AppError } from './common/errors';
import { sendError } from './common/response';

// Route imports
import { authRoutes, userAdminRoutes } from './modules/auth/routes';
import { downloadRoutes } from './modules/downloads/routes';
import { platformPublicRoutes, platformAdminRoutes } from './modules/platforms/routes';
import { blogPublicRoutes, blogAdminRoutes, categoryAdminRoutes, tagAdminRoutes } from './modules/blog/routes';
import { pagePublicRoutes, pageAdminRoutes } from './modules/pages/routes';
import { settingsPublicRoutes, settingsAdminRoutes } from './modules/settings/routes';
import { analyticsAdminRoutes } from './modules/analytics/routes';
import { sitemapRoutes, sitemapAdminRoutes } from './modules/sitemaps/routes';
import { ogImageRoutes } from './modules/og-images/routes';

async function buildServer() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      ...(env.NODE_ENV === 'development' && {
        transport: { target: 'pino-pretty', options: { colorize: true } },
      }),
    },
    trustProxy: true,
    maxParamLength: 500,
    bodyLimit: 1048576, // 1MB
  });

  // ── Register Plugins ──
  await registerPlugins(app);

  // ── Global Error Handler ──
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return sendError(reply, error);
    }

    // Zod validation errors
    if (error.name === 'ZodError') {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: (error as any).issues,
        },
      });
    }

    // Rate limit errors
    if (error.statusCode === 429) {
      return reply.status(429).send({
        success: false,
        error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests. Please try again later.' },
      });
    }

    // Log unexpected errors
    request.log.error(error, 'Unhandled error');
    return reply.status(500).send({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
    });
  });

  // ── 404 Handler ──
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      success: false,
      error: { code: 'NOT_FOUND', message: `Route ${request.method} ${request.url} not found` },
    });
  });

  // ── Health Check ──
  app.get('/api/v1/health', async (request, reply) => {
    const checks: Record<string, any> = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };

    // Database check
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = 'connected';
    } catch {
      checks.database = 'disconnected';
      checks.status = 'degraded';
    }

    // Redis check
    try {
      const r = getRedis();
      await r.ping();
      checks.redis = 'connected';
    } catch {
      checks.redis = 'disconnected';
      checks.status = 'degraded';
    }

    // yt-dlp check
    try {
      const { spawn } = require('child_process');
      const version = await new Promise<string>((resolve, reject) => {
        const proc = spawn(env.YTDLP_PATH, ['--version'], { timeout: 5000, env: { ...process.env } });
        let out = '';
        proc.stdout.on('data', (d: Buffer) => { out += d.toString(); });
        proc.on('close', (code: number) => {
          code === 0 ? resolve(out.trim()) : reject(new Error('yt-dlp not available'));
        });
        proc.on('error', reject);
      });
      checks.ytdlp = { status: 'available', version };
    } catch {
      checks.ytdlp = { status: 'unavailable' };
    }

    // ffmpeg check
    try {
      const { spawn } = require('child_process');
      const ffmpegVersion = await new Promise<string>((resolve, reject) => {
        const proc = spawn('ffmpeg', ['-version'], { timeout: 5000, env: { ...process.env } });
        let out = '';
        proc.stdout.on('data', (d: Buffer) => { out += d.toString(); });
        proc.on('close', (code: number) => {
          if (code === 0) {
            const firstLine = out.split('\n')[0] || '';
            const match = firstLine.match(/ffmpeg version ([\S]+)/);
            resolve(match ? match[1] : 'unknown');
          } else {
            reject(new Error('ffmpeg not available'));
          }
        });
        proc.on('error', reject);
      });
      checks.ffmpeg = { status: 'available', version: ffmpegVersion };
    } catch {
      checks.ffmpeg = { status: 'unavailable' };
    }

    reply.status(checks.status === 'ok' ? 200 : 503).send(checks);
  });

  // ── Public Routes ──
  app.register(settingsPublicRoutes, { prefix: '/api/v1/settings' });
  app.register(downloadRoutes, { prefix: '/api/v1/downloads' });
  app.register(platformPublicRoutes, { prefix: '/api/v1/platforms' });
  app.register(blogPublicRoutes, { prefix: '/api/v1/blog' });
  app.register(pagePublicRoutes, { prefix: '/api/v1/pages' });
  app.register(sitemapRoutes, { prefix: '/' });
  app.register(ogImageRoutes, { prefix: '/api/v1' });

  // ── Admin Routes ──
  app.register(authRoutes, { prefix: '/api/v1/admin/auth' });
  app.register(async (adminApp) => {
    adminApp.register(blogAdminRoutes, { prefix: '/posts' });
    adminApp.register(categoryAdminRoutes, { prefix: '/categories' });
    adminApp.register(tagAdminRoutes, { prefix: '/tags' });
    adminApp.register(pageAdminRoutes, { prefix: '/pages' });
    adminApp.register(platformAdminRoutes, { prefix: '/platforms' });
    adminApp.register(userAdminRoutes, { prefix: '/users' });
    adminApp.register(settingsAdminRoutes, { prefix: '/settings' });
    adminApp.register(analyticsAdminRoutes, { prefix: '/dashboard' });
    adminApp.register(sitemapAdminRoutes, { prefix: '/sitemaps' });
  }, { prefix: '/api/v1/admin' });

  // ── yt-dlp Admin Routes ──
  app.post('/api/v1/admin/yt-dlp/update', { preHandler: [(app as any).authenticate] }, async (request, reply) => {
    const { spawn } = require('child_process');
    const proc = spawn(env.YTDLP_PATH, ['--update'], { timeout: 60000, env: { ...process.env } });
    let output = '';
    proc.stdout.on('data', (d: Buffer) => { output += d.toString(); });
    proc.stderr.on('data', (d: Buffer) => { output += d.toString(); });
    proc.on('close', (code: number) => {
      reply.send({ success: code === 0, output: output.trim() });
    });
  });

  app.get('/api/v1/admin/yt-dlp/status', { preHandler: [(app as any).authenticate] }, async (request, reply) => {
    const { spawn } = require('child_process');
    const proc = spawn(env.YTDLP_PATH, ['--version'], { timeout: 5000, env: { ...process.env } });
    let output = '';
    proc.stdout.on('data', (d: Buffer) => { output += d.toString(); });
    proc.on('close', (code: number) => {
      reply.send({ success: true, version: output.trim(), available: code === 0 });
    });
  });

  return app;
}

// ── Start Server ──
async function start() {
  const app = await buildServer();

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down gracefully...`);
    try {
      await app.close();
      await prisma.$disconnect();
      const r = getRedis();
      await r.quit();
      process.exit(0);
    } catch (err) {
      app.log.error(err, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (err) => {
    app.log.error(err, 'Unhandled rejection');
  });
  process.on('uncaughtException', (err) => {
    app.log.fatal(err, 'Uncaught exception');
    process.exit(1);
  });

  try {
    const address = await app.listen({ port: env.API_PORT, host: '0.0.0.0' });
    app.log.info(`🚀 API server running at ${address}`);
  } catch (err) {
    app.log.fatal(err, 'Failed to start server');
    process.exit(1);
  }
}

start();
