import { type NextFunction, type Request, type Response } from 'express';

import { getConfig } from '../../config';
import { logger } from '../../logger';
import { RedisKeys } from '../../queue/keys';
import { getRedisClient } from '../../queue/redis';

function getRequestKey(request: Request): string {
  const forwardedFor = request.header('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  return request.ip || 'unknown';
}

function createRateLimiter(scope: 'webhook' | 'admin') {
  return async function rateLimiter(
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const config = getConfig();
      const limit =
        scope === 'webhook'
          ? config.server.rateLimit.webhookPerMinute
          : config.server.rateLimit.adminPerMinute;
      const requestKey = getRequestKey(request);
      const windowSlot = Math.floor(Date.now() / 60000);
      const redisKey = RedisKeys.rateLimit(scope, requestKey, windowSlot);
      const redis = getRedisClient();

      const currentCount = await redis.incr(redisKey);
      if (currentCount === 1) {
        await redis.expire(redisKey, 61);
      }

      response.setHeader('RateLimit-Limit', String(limit));
      response.setHeader('RateLimit-Remaining', String(Math.max(limit - currentCount, 0)));

      if (currentCount > limit) {
        response.status(429).json({
          error: 'rate_limit_exceeded',
        });
        return;
      }

      next();
    } catch (error) {
      logger.warn('Rate limiter failed open', {
        scope,
        error: String(error),
      });
      next();
    }
  };
}

export const webhookRateLimiter = createRateLimiter('webhook');
export const adminRateLimiter = createRateLimiter('admin');
