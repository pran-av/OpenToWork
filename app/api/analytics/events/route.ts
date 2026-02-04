import { NextRequest, NextResponse } from 'next/server';
import { noStoreJsonResponse } from '@/lib/utils/api-cache';
import { checkSlidingWindowRateLimit, getClientIP } from '@/lib/utils/rate-limit';
import { getRedisClient, ANALYTICS_STREAMS } from '@/lib/utils/redis-client';

const MAX_EVENTS_PER_BATCH = 60;
const MAX_PAYLOAD_SIZE = 100 * 1024; // 100KB

/**
 * POST /api/analytics/events
 * Accepts batched events and sends them to Redis Stream
 * Rate limited: 50 requests per 10 seconds per IP (sliding window)
 */
export async function POST(request: NextRequest) {
  try {
    // Debug log: entry into events API
    console.log('[Analytics Events] POST /api/analytics/events called');
    // Rate limiting: 50 requests per 10 seconds per IP
    const clientIP = getClientIP(request);
    const rateLimit = await checkSlidingWindowRateLimit(
      `events:${clientIP}`,
      50,
      10 // 10 seconds
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', resetAt: rateLimit.resetAt },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { session_id, events } = body;

    console.log('[Analytics Events] Payload received', {
      hasSessionId: !!session_id,
      eventsCount: Array.isArray(events) ? events.length : 'not-array',
    });

    // Validate required fields
    if (!session_id || typeof session_id !== 'string') {
      console.warn('[Analytics Events] Missing or invalid session_id');
      return NextResponse.json(
        { error: 'session_id is required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(events)) {
      console.warn('[Analytics Events] events is not an array');
      return NextResponse.json(
        { error: 'events must be an array' },
        { status: 400 }
      );
    }

    // Validate batch size
    if (events.length === 0) {
      console.warn('[Analytics Events] events array is empty');
      return NextResponse.json(
        { error: 'events array cannot be empty' },
        { status: 400 }
      );
    }

    if (events.length > MAX_EVENTS_PER_BATCH) {
      console.warn('[Analytics Events] Batch too large', { eventsLength: events.length });
      return NextResponse.json(
        { error: `Maximum ${MAX_EVENTS_PER_BATCH} events per batch` },
        { status: 400 }
      );
    }

    // Validate payload size
    const payloadSize = JSON.stringify(body).length;
    if (payloadSize > MAX_PAYLOAD_SIZE) {
      console.warn('[Analytics Events] Payload too large', { payloadSize });
      return NextResponse.json(
        { error: 'Payload too large' },
        { status: 400 }
      );
    }

    // Validate each event
    const validatedEvents: any[] = [];
    const rejectedEvents: number[] = [];

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      
      // Validate required fields
      if (
        !event.event_id ||
        !event.event_type ||
        !event.timestamp ||
        typeof event.event_id !== 'string' ||
        !['link_open', 'button_click'].includes(event.event_type) ||
        typeof event.timestamp !== 'string'
      ) {
        rejectedEvents.push(i);
        continue;
      }

      // Validate metadata structure if present
      if (event.metadata && typeof event.metadata !== 'object') {
        rejectedEvents.push(i);
        continue;
      }

      validatedEvents.push({
        session_id,
        event_id: event.event_id,
        event_type: event.event_type,
        metadata: event.metadata || null,
        timestamp: event.timestamp,
      });
    }

    // Send validated events to Redis Stream
    const redis = getRedisClient();
    let acceptedCount = 0;
    let failedCount = 0;

    console.log('[Analytics Events] Validated events', {
      validatedCount: validatedEvents.length,
      rejectedCount: rejectedEvents.length,
    });

    if (validatedEvents.length > 0) {
      // Retry logic: try up to 2 times
      let retries = 2;
      let success = false;

      while (retries >= 0 && !success) {
        try {
          // Add events to Redis Stream
          // Upstash Redis xadd format: xadd(key, id, fields)
          for (const event of validatedEvents) {
            await redis.xadd(
              ANALYTICS_STREAMS.EVENTS,
              '*', // Auto-generate message ID
              {
                session_id: event.session_id,
                event_id: event.event_id,
                event_type: event.event_type,
                metadata: JSON.stringify(event.metadata || {}),
                timestamp: event.timestamp,
              }
            );
          }
          success = true;
          acceptedCount = validatedEvents.length;
        } catch (error) {
          retries--;
          if (retries < 0) {
            console.error('[Analytics Events] Failed to send events to Redis after retries:', error);
            failedCount = validatedEvents.length;
          } else {
            // Wait a bit before retry
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }
      }
    }

    // Return response based on results
    if (acceptedCount === validatedEvents.length && rejectedEvents.length === 0) {
      // All events accepted
      return NextResponse.json(
        {
          accepted: acceptedCount,
          rejected: rejectedEvents.length,
        },
        { status: 200 }
      );
    } else {
      // Partial success or failure
      return NextResponse.json(
        {
          accepted: acceptedCount,
          rejected: rejectedEvents.length + failedCount,
        },
        { status: 202 }
      );
    }
  } catch (error) {
    console.error('[Analytics Events] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

