import { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import { env } from '../config/env';
import { getRedis } from '../config/redis';
import { registerAuthPlugin } from './auth';

export async function registerPlugins(app: FastifyInstance): Promise<void> {
  // Security headers
  await app.register(helmet, {
    contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
  });

  // CORS
  await app.register(cors, {
    origin: env.CORS_ORIGIN.split(',').map(o => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Rate limiting
  await app.register(rateLimit, {
    max: env.RATE_LIMIT_GENERAL,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
    redis: getRedis(),
    keyGenerator: (request) => {
      return request.headers['x-forwarded-for'] as string || request.ip;
    },
  });

  // Cookies
  await app.register(cookie, {
    secret: env.JWT_SECRET,
    parseOptions: {},
  });

  // File uploads
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
      files: 5,
    },
  });

  // Auth decorators
  await registerAuthPlugin(app);
}
