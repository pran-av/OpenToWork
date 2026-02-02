// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

/**
 * Analytics Worker Edge Function
 * Processes events and heartbeats from Redis Streams
 * Writes to internal.sessions and internal.events tables
 * Updates session flags based on activity
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Redis } from 'https://deno.land/x/upstash_redis@v1.19.3/mod.ts';

// Constants
const STREAM_EVENTS = 'analytics:events';
const STREAM_HEARTBEATS = 'analytics:heartbeats';
const BATCH_SIZE = 10; // Process 10 messages at a time
const SESSION_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
const ACTUAL_SESSION_THRESHOLD_SECONDS = 10; // 10 seconds for actual session

// Initialize Supabase client with service role key
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Upstash Redis client
const redisUrl = Deno.env.get('UPSTASH_REDIS_REST_URL')!;
const redisToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!;
const redis = new Redis({
  url: redisUrl,
  token: redisToken,
});

// Consumer group name (unique per worker instance)
const CONSUMER_GROUP = 'analytics-worker';
const CONSUMER_NAME = `worker-${Date.now()}`;

/**
 * Initialize consumer groups for streams
 */
async function initializeConsumerGroups() {
  try {
    // Create consumer group for events stream (if not exists)
    try {
      await redis.xgroup('CREATE', STREAM_EVENTS, CONSUMER_GROUP, '0', { mkstream: true });
    } catch (e: any) {
      // Group already exists, ignore
      if (!e.message?.includes('BUSYGROUP')) {
        console.error('[Worker] Error creating events consumer group:', e);
      }
    }

    // Create consumer group for heartbeats stream (if not exists)
    try {
      await redis.xgroup('CREATE', STREAM_HEARTBEATS, CONSUMER_GROUP, '0', { mkstream: true });
    } catch (e: any) {
      // Group already exists, ignore
      if (!e.message?.includes('BUSYGROUP')) {
        console.error('[Worker] Error creating heartbeats consumer group:', e);
      }
    }
  } catch (error) {
    console.error('[Worker] Error initializing consumer groups:', error);
  }
}

/**
 * Process events from Redis Stream
 */
async function processEvents() {
  try {
    // Read events from stream
    // Upstash Redis xreadgroup format: xreadgroup(group, consumer, key, id, opts)
    const messages = await redis.xreadgroup(
      CONSUMER_GROUP,
      CONSUMER_NAME,
      STREAM_EVENTS,
      '>', // Read new messages
      { count: BATCH_SIZE }
    ) as any;

    if (!messages || (Array.isArray(messages) && messages.length === 0)) {
      return { processed: 0, failed: 0 };
    }

    let processed = 0;
    let failed = 0;
    const messageIds: string[] = [];

    // Parse messages - format: [[stream, [[id, fields], ...]]]
    const streamData = Array.isArray(messages) && messages.length > 0 ? messages[0] : null;
    if (!streamData || !Array.isArray(streamData) || streamData.length < 2) {
      return { processed: 0, failed: 0 };
    }

    const streamMessages = streamData[1] as Array<[string, Record<string, string>]>;
    for (const [messageId, fields] of streamMessages) {
      try {
        // Parse message fields
        const sessionId = fields.session_id as string;
        const eventId = fields.event_id as string;
        const eventType = fields.event_type as string;
        const metadataStr = fields.metadata as string;
        const timestamp = fields.timestamp as string;

        // Parse metadata
        let metadata = null;
        try {
          metadata = metadataStr ? JSON.parse(metadataStr) : null;
        } catch {
          metadata = null;
        }

        // Insert event into database using RPC function (UNIQUE constraint handles deduplication)
        const { data: insertedEventId, error: insertError } = await supabase.rpc(
          'insert_analytics_event',
          {
            p_event_id: eventId,
            p_session_id: sessionId,
            p_event_type: eventType,
            p_metadata: metadata,
            p_timestamp: timestamp,
          }
        );

        if (insertError) {
          // Check if it's a unique constraint violation (duplicate)
          if (insertError.code === '23505' || insertError.message?.includes('duplicate')) {
            // Duplicate event, skip but acknowledge
            console.log(`[Worker] Duplicate event skipped: ${eventId}`);
            messageIds.push(messageId);
            processed++;
            continue;
          }
          throw insertError;
        }

        // If insert returned null, it was a duplicate (ON CONFLICT DO NOTHING)
        if (!insertedEventId) {
          console.log(`[Worker] Duplicate event skipped: ${eventId}`);
          messageIds.push(messageId);
          processed++;
          continue;
        }

        // Update session flag if needed
        await updateSessionFlag(sessionId);

        // Acknowledge message
        messageIds.push(messageId);
        processed++;
      } catch (error) {
        console.error(`[Worker] Error processing event ${messageId}:`, error);
        failed++;
      }
    }

    // Acknowledge processed messages
    if (messageIds.length > 0) {
      try {
        await redis.xack(STREAM_EVENTS, CONSUMER_GROUP, ...messageIds);
      } catch (error) {
        console.error('[Worker] Error acknowledging events:', error);
      }
    }

    return { processed, failed };
  } catch (error) {
    console.error('[Worker] Error processing events:', error);
    return { processed: 0, failed: 0 };
  }
}

/**
 * Process heartbeats from Redis Stream
 */
async function processHeartbeats() {
  try {
    // Read heartbeats from stream
    const messages = await redis.xreadgroup(
      CONSUMER_GROUP,
      CONSUMER_NAME,
      STREAM_HEARTBEATS,
      '>', // Read new messages
      { count: BATCH_SIZE }
    ) as any;

    if (!messages || (Array.isArray(messages) && messages.length === 0)) {
      return { processed: 0, failed: 0 };
    }

    let processed = 0;
    let failed = 0;
    const messageIds: string[] = [];
    const sessionTimeIncrements: Record<string, number> = {};

    // Parse messages - format: [[stream, [[id, fields], ...]]]
    const streamData = Array.isArray(messages) && messages.length > 0 ? messages[0] : null;
    if (!streamData || !Array.isArray(streamData) || streamData.length < 2) {
      return { processed: 0, failed: 0 };
    }

    const streamMessages = streamData[1] as Array<[string, Record<string, string>]>;
    // Accumulate time increments per session
    for (const [messageId, fields] of streamMessages) {
      try {
        const sessionId = fields.session_id as string;
        const timeIncrement = parseInt(fields.time_increment as string, 10);

        if (!sessionTimeIncrements[sessionId]) {
          sessionTimeIncrements[sessionId] = 0;
        }
        sessionTimeIncrements[sessionId] += timeIncrement;
        messageIds.push(messageId);
      } catch (error) {
        console.error(`[Worker] Error parsing heartbeat ${messageId}:`, error);
        failed++;
      }
    }

    // Update sessions with accumulated time
    for (const [sessionId, totalIncrement] of Object.entries(sessionTimeIncrements)) {
      try {
        // Check if session exists and is not expired
        const { data: session, error: sessionError } = await supabase
          .from('internal.sessions')
          .select('session_id, started_at, active_time_spent, session_flag')
          .eq('session_id', sessionId)
          .single();

        if (sessionError || !session) {
          console.log(`[Worker] Session not found or expired: ${sessionId}`);
          continue;
        }

        // Check session expiration (30 minutes of inactivity)
        const now = new Date();
        const startedAt = new Date(session.started_at);
        const timeSinceStart = now.getTime() - startedAt.getTime();

        if (timeSinceStart > SESSION_EXPIRY_MS) {
          // Session expired, end it using direct update (service role can access internal schema)
          const { error: endError } = await supabase
            .from('internal.sessions')
            .update({ ended_at: now.toISOString() })
            .eq('session_id', sessionId);
          
          if (endError) {
            console.error(`[Worker] Error ending expired session:`, endError);
          }
          continue;
        }

        // Increment active_time_spent using RPC function
        const { data: updateSuccess, error: updateError } = await supabase.rpc(
          'update_analytics_session',
          {
            p_session_id: sessionId,
            p_time_increment: totalIncrement,
            p_session_flag: null, // Don't update flag here, do it separately
          }
        );

        if (updateError || !updateSuccess) {
          throw updateError || new Error('Failed to update session');
        }

        // Update session flag if needed
        await updateSessionFlag(sessionId);

        processed++;
      } catch (error) {
        console.error(`[Worker] Error processing heartbeat for session ${sessionId}:`, error);
        failed++;
      }
    }

    // Acknowledge processed messages
    if (messageIds.length > 0) {
      try {
        await redis.xack(STREAM_HEARTBEATS, CONSUMER_GROUP, ...messageIds);
      } catch (error) {
        console.error('[Worker] Error acknowledging heartbeats:', error);
      }
    }

    return { processed, failed };
  } catch (error) {
    console.error('[Worker] Error processing heartbeats:', error);
    return { processed: 0, failed: 0 };
  }
}

/**
 * Update session flag based on activity
 * new_session -> actual_session (>10s) -> engaged_session (actual + events)
 */
async function updateSessionFlag(sessionId: string) {
  try {
    // Get current session data using RPC function
    const { data: sessionData, error: sessionError } = await supabase.rpc(
      'get_analytics_session_for_flag_update',
      { p_session_id: sessionId }
    );

    if (sessionError || !sessionData || sessionData.length === 0) {
      return;
    }

    const session = sessionData[0];
    const currentFlag = session.session_flag;
    const timeSpent = session.active_time_spent || 0;
    const hasEvents = session.has_events || false;

    // Check if session should be upgraded to actual_session (>10 seconds)
    if (currentFlag === 'new_session' && timeSpent >= ACTUAL_SESSION_THRESHOLD_SECONDS) {
      const { error: updateError } = await supabase.rpc(
        'update_analytics_session',
        {
          p_session_id: sessionId,
          p_time_increment: 0,
          p_session_flag: 'actual_session',
        }
      );

      if (updateError) {
        console.error(`[Worker] Error updating session flag to actual_session:`, updateError);
      }
      return;
    }

    // Check if session should be upgraded to engaged_session (actual + has events)
    if (currentFlag === 'actual_session' && hasEvents) {
      const { error: updateError } = await supabase.rpc(
        'update_analytics_session',
        {
          p_session_id: sessionId,
          p_time_increment: 0,
          p_session_flag: 'engaged_session',
        }
      );

      if (updateError) {
        console.error(`[Worker] Error updating session flag to engaged_session:`, updateError);
      }
    }
  } catch (error) {
    console.error(`[Worker] Error updating session flag for ${sessionId}:`, error);
  }
}

/**
 * Main handler function
 */
Deno.serve(async (req: Request) => {
  try {
    // Initialize consumer groups on first run
    await initializeConsumerGroups();

    // Process events and heartbeats
    const [eventsResult, heartbeatsResult] = await Promise.all([
      processEvents(),
      processHeartbeats(),
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        events: {
          processed: eventsResult.processed,
          failed: eventsResult.failed,
        },
        heartbeats: {
          processed: heartbeatsResult.processed,
          failed: heartbeatsResult.failed,
        },
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Worker] Fatal error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

