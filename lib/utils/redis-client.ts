/**
 * Upstash Redis Client Utility
 * Uses @upstash/redis for serverless Redis operations
 * Automatically reads UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from environment
 */

import { Redis } from '@upstash/redis';

let redisClient: Redis | null = null;

/**
 * Get or create Redis client instance
 * Uses singleton pattern to reuse connection
 */
export function getRedisClient(): Redis {
  if (redisClient) {
    return redisClient;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set');
  }

  redisClient = new Redis({
    url,
    token,
  });

  return redisClient;
}

/**
 * Stream names for analytics events
 */
export const ANALYTICS_STREAMS = {
  EVENTS: 'analytics:events',
  HEARTBEATS: 'analytics:heartbeats',
} as const;

