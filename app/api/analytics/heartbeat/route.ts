import { NextRequest, NextResponse } from 'next/server';
import { noStoreJsonResponse } from '@/lib/utils/api-cache';
import { getRedisClient, ANALYTICS_STREAMS } from '@/lib/utils/redis-client';

/**
 * POST /api/analytics/heartbeat
 * Accepts heartbeat pings and sends them to Redis Stream for worker processing
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id, time_increment } = body;

    // Validate required fields
    if (!session_id || typeof session_id !== 'string') {
      return NextResponse.json(
        { error: 'session_id is required' },
        { status: 400 }
      );
    }

    if (typeof time_increment !== 'number' || time_increment <= 0) {
      return NextResponse.json(
        { error: 'time_increment must be a positive number' },
        { status: 400 }
      );
    }

    // Send heartbeat to Redis Stream
    const redis = getRedisClient();
    
    try {
      await redis.xadd(
        ANALYTICS_STREAMS.HEARTBEATS,
        '*', // Auto-generate message ID
        {
          session_id,
          time_increment: time_increment.toString(),
          timestamp: new Date().toISOString(),
        }
      );

      return noStoreJsonResponse({ success: true });
    } catch (error) {
      // console.error('[Analytics Heartbeat] Error sending to Redis:', error);
      // Return 202 even on error - heartbeat is best-effort
      return NextResponse.json(
        { success: false, error: 'Failed to process heartbeat' },
        { status: 202 }
      );
    }
  } catch (error) {
    // console.error('[Analytics Heartbeat] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

