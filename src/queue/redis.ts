import Redis from 'ioredis';

import { logger } from '../logger';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error('REDIS_URL environment variable is required');
    }

    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    redisClient.on('error', (error) => {
      logger.error('Redis error', { error: String(error) });
    });
  }

  return redisClient;
}

export async function pingRedis(): Promise<void> {
  const redis = getRedisClient();
  await redis.ping();
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
