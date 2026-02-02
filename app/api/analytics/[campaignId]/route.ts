import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { cachedPrivateJsonResponse } from '@/lib/utils/api-cache';

interface RouteParams {
  params: Promise<{ campaignId: string }>;
}

/**
 * GET /api/analytics/[campaignId]
 * Returns analytics data for a campaign
 * Only accessible by campaign owners
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { campaignId } = await params;

    if (!campaignId || typeof campaignId !== 'string') {
      return NextResponse.json(
        { error: 'campaignId is required' },
        { status: 400 }
      );
    }

    // Get Supabase client
    const supabase = await createServerClient();
    
    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get analytics data via RPC function (includes ownership check)
    const { data: analyticsData, error } = await supabase.rpc(
      'get_campaign_analytics',
      { p_campaign_id: campaignId }
    );

    if (error) {
      console.error('[Analytics] Error fetching analytics:', error);
      return NextResponse.json(
        { error: 'Failed to fetch analytics' },
        { status: 500 }
      );
    }

    // RPC function returns empty result if user doesn't own the campaign
    if (!analyticsData || analyticsData.length === 0) {
      return NextResponse.json(
        { error: 'Campaign not found or access denied' },
        { status: 404 }
      );
    }

    const analytics = analyticsData[0];

    return cachedPrivateJsonResponse({
      total_actual_sessions: Number(analytics.total_actual_sessions) || 0,
      total_engaged_sessions: Number(analytics.total_engaged_sessions) || 0,
      total_time_spent: Number(analytics.total_time_spent) || 0,
    });
  } catch (error) {
    console.error('[Analytics] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

