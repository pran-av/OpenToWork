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

/**
 * Execute Redis command via REST API (for commands not directly supported)
 * Upstash Redis REST API format: POST to base URL with command array in body
 * Response format: { result: ... } or direct result
 */
async function redisCommand(command: (string | number)[]): Promise<any> {
  // Convert all values to strings for the command array
  const commandArray = command.map(c => String(c));
  
  const response = await fetch(redisUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${redisToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commandArray),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Redis command failed (${response.status}): ${errorText}`);
  }
  
  const result = await response.json();
  // Upstash REST API returns { result: ... } format
  return result.result !== undefined ? result.result : result;
}

// Consumer group name (unique per worker instance)
const CONSUMER_GROUP = 'analytics-worker';
const CONSUMER_NAME = `worker-${Date.now()}`;

/**
 * Initialize consumer groups for streams
 */
async function initializeConsumerGroups() {
  try {
    // Create consumer group for events stream (if not exists)
    // Use REST API directly for XGROUP command
    try {
      await redisCommand(['XGROUP', 'CREATE', STREAM_EVENTS, CONSUMER_GROUP, '0', 'MKSTREAM']);
    } catch (e: any) {
      // Group already exists, ignore
      if (!e.message?.includes('BUSYGROUP') && !e.message?.includes('already exists')) {
        console.error('[Worker] Error creating events consumer group:', e);
      }
    }

    // Create consumer group for heartbeats stream (if not exists)
    try {
      await redisCommand(['XGROUP', 'CREATE', STREAM_HEARTBEATS, CONSUMER_GROUP, '0', 'MKSTREAM']);
    } catch (e: any) {
      // Group already exists, ignore
      if (!e.message?.includes('BUSYGROUP') && !e.message?.includes('already exists')) {
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
    // Use REST API directly for XREADGROUP command
    const messages = await redisCommand([
      'XREADGROUP',
      'GROUP', CONSUMER_GROUP,
      CONSUMER_NAME,
      'COUNT', BATCH_SIZE.toString(),
      'STREAMS', STREAM_EVENTS,
      '>' // Read new messages
    ]) as any;

    if (!messages || (Array.isArray(messages) && messages.length === 0)) {
      return { processed: 0, failed: 0 };
    }

    let processed = 0;
    let failed = 0;
    const messageIds: string[] = [];

    // Parse messages - format: [[stream, [[id, [field1, val1, field2, val2, ...]], ...]]]
    // Redis Streams return fields as flat array: [field1, value1, field2, value2, ...]
    const streamData = Array.isArray(messages) && messages.length > 0 ? messages[0] : null;
    if (!streamData || !Array.isArray(streamData) || streamData.length < 2) {
      return { processed: 0, failed: 0 };
    }

    const streamMessages = streamData[1] as Array<[string, string[]]>;
    for (const [messageId, fieldArray] of streamMessages) {
      try {
        // Convert flat array [field1, val1, field2, val2, ...] to object
        const fields: Record<string, string> = {};
        for (let i = 0; i < fieldArray.length; i += 2) {
          if (i + 1 < fieldArray.length) {
            fields[fieldArray[i]] = fieldArray[i + 1];
          }
        }

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
        // Function signature: insert_analytics_event(p_event_id, p_session_id, p_event_type, p_timestamp, p_metadata)
        // Ensure all required parameters are valid
        if (!eventId || !sessionId || !eventType || !timestamp) {
          console.error(`[Worker] Missing required fields for event ${messageId}:`, {
            eventId,
            sessionId,
            eventType,
            timestamp,
          });
          failed++;
          continue;
        }

        // Build parameters object matching function signature exactly
        const rpcParams: any = {
          p_event_id: eventId,
          p_session_id: sessionId,
          p_event_type: eventType,
          p_timestamp: timestamp,
        };

        // Only include p_metadata if it's not null (optional parameter)
        if (metadata !== null) {
          rpcParams.p_metadata = metadata;
        }

        const { data: insertedEventId, error: insertError } = await supabase.rpc(
          'insert_analytics_event',
          rpcParams
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
        await redisCommand(['XACK', STREAM_EVENTS, CONSUMER_GROUP, ...messageIds]);
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
    // Use REST API directly for XREADGROUP command
    const messages = await redisCommand([
      'XREADGROUP',
      'GROUP', CONSUMER_GROUP,
      CONSUMER_NAME,
      'COUNT', BATCH_SIZE.toString(),
      'STREAMS', STREAM_HEARTBEATS,
      '>' // Read new messages
    ]) as any;

    if (!messages || (Array.isArray(messages) && messages.length === 0)) {
      return { processed: 0, failed: 0 };
    }

    let processed = 0;
    let failed = 0;
    const messageIds: string[] = [];
    const sessionTimeIncrements: Record<string, number> = {};

    // Parse messages - format: [[stream, [[id, [field1, val1, field2, val2, ...]], ...]]]
    // Redis Streams return fields as flat array: [field1, value1, field2, value2, ...]
    const streamData = Array.isArray(messages) && messages.length > 0 ? messages[0] : null;
    if (!streamData || !Array.isArray(streamData) || streamData.length < 2) {
      return { processed: 0, failed: 0 };
    }

    const streamMessages = streamData[1] as Array<[string, string[]]>;
    // Accumulate time increments per session
    for (const [messageId, fieldArray] of streamMessages) {
      try {
        // Convert flat array [field1, val1, field2, val2, ...] to object
        const fields: Record<string, string> = {};
        for (let i = 0; i < fieldArray.length; i += 2) {
          if (i + 1 < fieldArray.length) {
            fields[fieldArray[i]] = fieldArray[i + 1];
          }
        }

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
        // Use RPC function to query internal.sessions (Supabase client can't query internal schema directly)
        const { data: sessionData, error: sessionError } = await supabase.rpc(
          'get_analytics_session',
          { p_session_id: sessionId }
        );

        if (sessionError) {
          // Log the actual error to debug
          console.error(`[Worker] Error fetching session ${sessionId}:`, {
            error: sessionError.message,
            code: sessionError.code,
            details: sessionError.details,
            hint: sessionError.hint,
          });
          continue;
        }

        if (!sessionData || sessionData.length === 0) {
          console.log(`[Worker] Session not found: ${sessionId}`);
          continue;
        }

        const session = sessionData[0];

        // Check session expiration (30 minutes of inactivity)
        const now = new Date();
        const startedAt = new Date(session.started_at);
        const timeSinceStart = now.getTime() - startedAt.getTime();

        if (timeSinceStart > SESSION_EXPIRY_MS) {
          // Session expired, end it using RPC function
          const { error: endError } = await supabase.rpc(
            'end_analytics_session',
            { p_session_id: sessionId }
          );
          
          if (endError) {
            console.error(`[Worker] Error ending expired session:`, endError);
          } else {
            console.log(`[Worker] Session expired and ended (${Math.floor(timeSinceStart / 1000)}s old): ${sessionId}`);
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
        await redisCommand(['XACK', STREAM_HEARTBEATS, CONSUMER_GROUP, ...messageIds]);
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
 * new_session -> actual_session (>10s) -> engaged_session (actual + more than one event)
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
    const eventCount = session.event_count || 0;

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

    // Check if session should be upgraded to engaged_session (actual + more than one event)
    if (currentFlag === 'actual_session' && eventCount > 1) {
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

