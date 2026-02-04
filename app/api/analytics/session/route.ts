import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { noStoreJsonResponse } from '@/lib/utils/api-cache';
import { checkFixedWindowRateLimit, getClientIP } from '@/lib/utils/rate-limit';
import { createHash } from 'crypto';
import { cookies } from 'next/headers';
import { v7 as uuidv7 } from 'uuid';

const SESSION_COOKIE_NAME = 'analytics_session_id';
const SESSION_COOKIE_TTL_SECONDS = 30 * 60; // 30 minutes

/**
 * Hash user agent string using SHA-256
 */
function hashUserAgent(ua: string): string {
  return createHash('sha256').update(ua).digest('hex');
}

/**
 * Get cookie options for session cookie
 */
function getSessionCookieOptions() {
  const isProduction = process.env.ENVIRONMENT === 'production' || process.env.NODE_ENV === 'production';
  
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_COOKIE_TTL_SECONDS,
  };
}

/**
 * POST /api/analytics/session
 * Creates a new analytics session
 * Rate limited: 5 requests per minute per IP (fixed window)
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 5 requests per minute per IP
    const clientIP = getClientIP(request);
    const rateLimit = await checkFixedWindowRateLimit(
      `session:${clientIP}`,
      5,
      60 // 1 minute
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', resetAt: rateLimit.resetAt },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { project_id, user_agent_hash } = body;

    // Validate required fields
    if (!project_id || typeof project_id !== 'string') {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    // Hash user agent server-side (always store SHA-256 hex)
    const uaHash = user_agent_hash && typeof user_agent_hash === 'string'
      ? hashUserAgent(user_agent_hash)
      : null;

    // Get Supabase client
    const supabase = await createServerClient();
    
    // Get user ID from session (may be null for anonymous users)
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;

    // Get active campaign for project
    const { data: campaignData, error: campaignError } = await supabase.rpc(
      'get_active_campaign_by_project',
      { p_project_id: project_id }
    );

    let campaignId: string | null = null;
    if (campaignData && campaignData.length > 0) {
      campaignId = campaignData[0].campaign_id;
    }

    // Generate session ID using UUIDv7 (time-sortable, valid UUID)
    const sessionId = uuidv7();

    // Create session in database using RPC function
    const { data: sessionData, error: insertError } = await supabase.rpc(
      'create_analytics_session',
      {
        p_session_id: sessionId,
        p_project_id: project_id,
        p_user_id: userId,
        p_campaign_id: campaignId,
        p_user_agent_hash: uaHash,
      }
    );

    if (insertError) {
      console.error('[Analytics Session] Error creating session:', insertError);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    if (!sessionData || sessionData.length === 0) {
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    const insertedSession = sessionData[0];

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionId, getSessionCookieOptions());

    return noStoreJsonResponse({
      session_id: sessionId,
      campaign_id: campaignId,
    });
  } catch (error) {
    console.error('[Analytics Session] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

