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
const STREAM_MAX_LENGTH = 10000; // Keep max 10k messages in stream (XTRIM)

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
 * Read messages from a stream (both pending and new)
 */
async function readStreamMessages(stream: string): Promise<Array<[string, string[]]>> {
  const allMessages: Array<[string, string[]]> = [];
  
  // First, read pending messages (previously delivered but not acknowledged)
  try {
    const pendingMessages = await redisCommand([
      'XREADGROUP',
      'GROUP', CONSUMER_GROUP,
      CONSUMER_NAME,
      'COUNT', BATCH_SIZE.toString(),
      'STREAMS', stream,
      '0' // Read pending messages
    ]) as any;
    
    if (pendingMessages && Array.isArray(pendingMessages) && pendingMessages.length > 0) {
      const streamData = pendingMessages[0];
      if (streamData && Array.isArray(streamData) && streamData.length >= 2) {
        const messages = streamData[1] as Array<[string, string[]]>;
        if (messages && messages.length > 0) {
          console.log(`[Worker] Found ${messages.length} pending messages in ${stream}`);
          allMessages.push(...messages);
        }
      }
    }
  } catch (error) {
    console.error(`[Worker] Error reading pending messages from ${stream}:`, error);
  }
  
  // Then, read new messages
  try {
    const newMessages = await redisCommand([
      'XREADGROUP',
      'GROUP', CONSUMER_GROUP,
      CONSUMER_NAME,
      'COUNT', BATCH_SIZE.toString(),
      'STREAMS', stream,
      '>' // Read new messages
    ]) as any;
    
    if (newMessages && Array.isArray(newMessages) && newMessages.length > 0) {
      const streamData = newMessages[0];
      if (streamData && Array.isArray(streamData) && streamData.length >= 2) {
        const messages = streamData[1] as Array<[string, string[]]>;
        if (messages && messages.length > 0) {
          console.log(`[Worker] Found ${messages.length} new messages in ${stream}`);
          allMessages.push(...messages);
        }
      }
    }
  } catch (error) {
    console.error(`[Worker] Error reading new messages from ${stream}:`, error);
  }
  
  return allMessages;
}

/**
 * Acknowledge messages and trim stream to max length
 */
async function acknowledgeAndTrimStream(stream: string, messageIds: string[]): Promise<void> {
  if (messageIds.length === 0) return;
  
  try {
    // Acknowledge messages (marks them as processed)
    await redisCommand(['XACK', stream, CONSUMER_GROUP, ...messageIds]);
    console.log(`[Worker] Acknowledged ${messageIds.length} messages from ${stream}`);
    
    // Trim stream to max length (keeps most recent messages, removes old ones)
    // Using ~ for approximate trimming (more efficient)
    await redisCommand(['XTRIM', stream, 'MAXLEN', '~', STREAM_MAX_LENGTH.toString()]);
    console.log(`[Worker] Trimmed ${stream} to max length ${STREAM_MAX_LENGTH}`);
  } catch (error) {
    console.error(`[Worker] Error acknowledging/trimming ${stream}:`, error);
  }
}

/**
 * Process events from Redis Stream
 */
async function processEvents() {
  try {
    // Read both pending and new events
    const streamMessages = await readStreamMessages(STREAM_EVENTS);

    if (streamMessages.length === 0) {
      console.log('[Worker] No events to process');
      return { processed: 0, failed: 0 };
    }

    console.log(`[Worker] Processing ${streamMessages.length} events`);

    let processed = 0;
    let failed = 0;
    const messageIds: string[] = [];

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

        // Validate required fields
        if (!eventId || !sessionId || !eventType || !timestamp) {
          console.error(`[Worker] Missing required fields for event ${messageId}:`, {
            eventId,
            sessionId,
            eventType,
            timestamp,
          });
          // Still acknowledge invalid messages to remove them from queue
          messageIds.push(messageId);
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
          // Check if it's a foreign key violation (session doesn't exist)
          if (insertError.code === '23503' || insertError.message?.includes('foreign key constraint') || insertError.message?.includes('events_session_id_fkey')) {
            // Session doesn't exist (likely from DB reset), skip but acknowledge
            console.log(`[Worker] Orphaned event skipped (session not found): ${eventId} for session ${sessionId}`);
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

        // Mark message for deletion
        messageIds.push(messageId);
        processed++;
        console.log(`[Worker] Event processed: ${eventId}`);
      } catch (error) {
        console.error(`[Worker] Error processing event ${messageId}:`, error);
        // Still acknowledge failed messages to prevent infinite retry
        messageIds.push(messageId);
        failed++;
      }
    }

    // Acknowledge and trim stream
    await acknowledgeAndTrimStream(STREAM_EVENTS, messageIds);

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
    // Read both pending and new heartbeats
    const streamMessages = await readStreamMessages(STREAM_HEARTBEATS);

    if (streamMessages.length === 0) {
      console.log('[Worker] No heartbeats to process');
      return { processed: 0, failed: 0 };
    }

    console.log(`[Worker] Processing ${streamMessages.length} heartbeats`);

    let processed = 0;
    let failed = 0;
    let expired = 0;
    const messageIds: string[] = [];
    const sessionTimeIncrements: Record<string, number> = {};

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
        messageIds.push(messageId); // Still mark for deletion
        failed++;
      }
    }

    // Update sessions with accumulated time
    for (const [sessionId, totalIncrement] of Object.entries(sessionTimeIncrements)) {
      try {
        // Check if session exists
        const { data: sessionData, error: sessionError } = await supabase.rpc(
          'get_analytics_session',
          { p_session_id: sessionId }
        );

        if (sessionError) {
          console.error(`[Worker] Error fetching session ${sessionId}:`, sessionError.message);
          failed++;
          continue;
        }

        if (!sessionData || sessionData.length === 0) {
          console.log(`[Worker] Session not found: ${sessionId}`);
          failed++;
          continue;
        }

        const session = sessionData[0];

        // Check session expiration (30 minutes of inactivity)
        const now = new Date();
        const startedAt = new Date(session.started_at);
        const timeSinceStart = now.getTime() - startedAt.getTime();

        if (timeSinceStart > SESSION_EXPIRY_MS) {
          // Session expired - still update time spent before ending
          if (session.ended_at === null) {
            // Update time spent first
            await supabase.rpc('update_analytics_session', {
              p_session_id: sessionId,
              p_time_increment: totalIncrement,
              p_session_flag: null,
            });
            
            // Then end the session
            const { error: endError } = await supabase.rpc(
              'end_analytics_session',
              { p_session_id: sessionId }
            );
            
            if (endError) {
              console.error(`[Worker] Error ending expired session:`, endError);
            } else {
              console.log(`[Worker] Session expired and ended (${Math.floor(timeSinceStart / 1000)}s old, +${totalIncrement}s): ${sessionId}`);
            }
          }
          expired++;
          continue;
        }

        // Session is active - increment active_time_spent
        const { data: updateSuccess, error: updateError } = await supabase.rpc(
          'update_analytics_session',
          {
            p_session_id: sessionId,
            p_time_increment: totalIncrement,
            p_session_flag: null,
          }
        );

        if (updateError || !updateSuccess) {
          throw updateError || new Error('Failed to update session');
        }

        // Update session flag if needed
        await updateSessionFlag(sessionId);

        processed++;
        console.log(`[Worker] Heartbeat processed for session ${sessionId}: +${totalIncrement}s`);
      } catch (error) {
        console.error(`[Worker] Error processing heartbeat for session ${sessionId}:`, error);
        failed++;
      }
    }

    // Acknowledge and trim stream
    await acknowledgeAndTrimStream(STREAM_HEARTBEATS, messageIds);

    return { processed, failed, expired };
  } catch (error) {
    console.error('[Worker] Error processing heartbeats:', error);
    return { processed: 0, failed: 0, expired: 0 };
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
    console.log('[Worker] Starting worker invocation');
    
    // Initialize consumer groups on first run
    await initializeConsumerGroups();
    console.log('[Worker] Consumer groups initialized');

    // Process events and heartbeats
    console.log('[Worker] Processing events and heartbeats...');
    const [eventsResult, heartbeatsResult] = await Promise.all([
      processEvents(),
      processHeartbeats(),
    ]);

    const heartbeatsExpired = (heartbeatsResult as any).expired || 0;
    console.log('[Worker] Processing complete:', {
      events: { processed: eventsResult.processed, failed: eventsResult.failed },
      heartbeats: { processed: heartbeatsResult.processed, failed: heartbeatsResult.failed, expired: heartbeatsExpired },
    });

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
          expired: heartbeatsExpired,
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

