import * as dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: '../.env' });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  API_PORT: z.coerce.number().default(7500),
  SITE_NAME: z.string().default('VideoDownloader'),
  SITE_URL: z.string().default('http://localhost:7600'),
  SITE_ADMIN_EMAIL: z.string().default('admin@example.com'),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRY: z.string().default('365d'),
  JWT_REFRESH_EXPIRY: z.string().default('365d'),
  S3_BUCKET: z.string().default('platform-assets'),
  S3_REGION: z.string().default('us-east-1'),
  S3_ENDPOINT: z.string().default(''),
  S3_ACCESS_KEY: z.string().default(''),
  S3_SECRET_KEY: z.string().default(''),
  YTDLP_PATH: z.string().default('yt-dlp'),
  YTDLP_AUTO_UPDATE: z.coerce.boolean().default(true),
  YTDLP_UPDATE_CRON: z.string().default('0 3 * * *'),
  YTDLP_TIMEOUT: z.coerce.number().default(120000),
  YTDLP_MAX_FILESIZE: z.string().default('500M'),
  WORKER_CONCURRENCY: z.coerce.number().default(5),
  WORKER_MAX_RETRIES: z.coerce.number().default(3),
  RATE_LIMIT_DOWNLOAD: z.coerce.number().default(30),
  RATE_LIMIT_GENERAL: z.coerce.number().default(100),
  RATE_LIMIT_LOGIN: z.coerce.number().default(5),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  LOG_LEVEL: z.string().default('info'),
  CORS_ORIGIN: z.string().default('http://localhost:7600'),
});

export type EnvConfig = z.infer<typeof envSchema>;

function loadEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.format());
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();
