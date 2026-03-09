import Redis from 'ioredis';
import { env } from './env';

let redis: Redis;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy(times: number) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });
    redis.on('error', (err) => console.error('Redis connection error:', err.message));
    redis.on('connect', () => console.log('✅ Redis connected'));
  }
  return redis;
}

export async function getCachedData<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
  const r = getRedis();
  const cached = await r.get(key);
  if (cached) return JSON.parse(cached) as T;
  const data = await fetcher();
  await r.setex(key, ttlSeconds, JSON.stringify(data));
  return data;
}

export async function invalidateCache(pattern: string): Promise<void> {
  const r = getRedis();
  const keys = await r.keys(pattern);
  if (keys.length > 0) await r.del(...keys);
}

export { redis };
