/**
 * Rate Limiting Utilities
 * Implements fixed window and sliding window rate limiting using Upstash Redis
 */

import { getRedisClient } from './redis-client';

/**
 * Fixed window rate limiter
 * Used for session creation: 5 requests per minute per IP
 */
export async function checkFixedWindowRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const redis = getRedisClient();
  const now = Date.now();
  const windowStart = Math.floor(now / (windowSeconds * 1000)) * (windowSeconds * 1000);
  const redisKey = `rate_limit:fixed:${key}:${windowStart}`;

  try {
    // Get current count
    const count = await redis.get<number>(redisKey);
    const currentCount = count || 0;

    if (currentCount >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: windowStart + windowSeconds * 1000,
      };
    }

    // Increment count
    const newCount = await redis.incr(redisKey);
    await redis.expire(redisKey, windowSeconds);

    return {
      allowed: true,
      remaining: limit - newCount,
      resetAt: windowStart + windowSeconds * 1000,
    };
  } catch (error) {
    console.error('[RateLimit] Error checking fixed window rate limit:', error);
    // On error, allow the request (fail open)
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: now + windowSeconds * 1000,
    };
  }
}

/**
 * Sliding window rate limiter
 * Used for events: 50 requests per 10 seconds per IP
 */
export async function checkSlidingWindowRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const redis = getRedisClient();
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const redisKey = `rate_limit:sliding:${key}`;

  try {
    // Remove old entries outside the window
    const cutoff = now - windowMs;
    await redis.zremrangebyscore(redisKey, 0, cutoff);

    // Count entries in the window
    const count = await redis.zcard(redisKey);

    if (count >= limit) {
      // Get oldest entry to calculate reset time
      // zrange with withScores returns [member, score] pairs
      const oldest = await redis.zrange<string[]>(redisKey, 0, 0, { 
        byScore: true,
        withScores: true 
      });
      // Extract score from [member, score] pair
      const oldestScore = oldest && oldest.length >= 2 ? Number(oldest[1]) : now;
      const resetAt = oldestScore + windowMs;

      return {
        allowed: false,
        remaining: 0,
        resetAt,
      };
    }

    // Add current request to the window
    await redis.zadd(redisKey, { score: now, member: `${now}-${Math.random()}` });
    await redis.expire(redisKey, windowSeconds);

    return {
      allowed: true,
      remaining: limit - count - 1,
      resetAt: now + windowMs,
    };
  } catch (error) {
    console.error('[RateLimit] Error checking sliding window rate limit:', error);
    // On error, allow the request (fail open)
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: now + windowMs,
    };
  }
}

/**
 * Get client IP address from request
 */
export function getClientIP(request: Request): string {
  // Try various headers for IP address
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback (shouldn't happen in production)
  return 'unknown';
}

