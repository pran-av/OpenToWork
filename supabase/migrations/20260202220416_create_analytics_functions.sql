-- Migration: Create Analytics Functions and Views
-- This migration creates functions and views for accessing analytics data
-- Analytics data is stored in internal schema, exposed via public views/functions with RLS

-- Step 1: Create view in public schema that queries internal tables
-- This view will be used by RPC functions to access analytics data
CREATE OR REPLACE VIEW public.campaign_analytics_view AS
SELECT 
  s.campaign_id,
  s.project_id,
  s.session_id,
  s.user_id,
  s.session_flag,
  s.active_time_spent,
  s.started_at,
  s.ended_at,
  COUNT(DISTINCT e.event_id) as event_count
FROM internal.sessions s
LEFT JOIN internal.events e ON s.session_id = e.session_id
WHERE s.campaign_id IS NOT NULL
GROUP BY 
  s.campaign_id,
  s.project_id,
  s.session_id,
  s.user_id,
  s.session_flag,
  s.active_time_spent,
  s.started_at,
  s.ended_at;

-- Step 2: Create RLS policy on the view
-- Only campaign owners can view analytics for their campaigns
ALTER VIEW public.campaign_analytics_view OWNER TO postgres;

-- Note: RLS on views requires policies on underlying tables
-- We'll create a function that checks ownership instead

-- Step 3: Create function to check campaign ownership
-- This function is used to verify that the current user owns the campaign
CREATE OR REPLACE FUNCTION public.check_campaign_ownership(
  p_campaign_id UUID
) RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
STABLE
AS $$
DECLARE
  v_project_id UUID;
  v_user_id UUID;
BEGIN
  -- Sanitize input
  IF p_campaign_id IS NULL THEN
    RETURN false;
  END IF;

  -- Get current user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Get project_id for the campaign
  SELECT project_id INTO v_project_id
  FROM public.campaigns
  WHERE campaign_id = p_campaign_id;

  IF v_project_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check if user owns the project
  RETURN EXISTS (
    SELECT 1
    FROM public.projects
    WHERE project_id = v_project_id
      AND user_id = v_user_id
  );
END;
$$;

-- Step 4: Create function to get campaign analytics
-- Returns aggregated analytics data for a campaign
-- Only accessible by campaign owners (checked via ownership function)
CREATE OR REPLACE FUNCTION public.get_campaign_analytics(
  p_campaign_id UUID
) RETURNS TABLE (
  total_actual_sessions BIGINT,
  total_engaged_sessions BIGINT,
  total_time_spent BIGINT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
STABLE
AS $$
DECLARE
  v_ownership_check boolean;
BEGIN
  -- Sanitize input
  IF p_campaign_id IS NULL THEN
    RETURN;
  END IF;

  -- Check ownership - only campaign owners can view analytics
  SELECT public.check_campaign_ownership(p_campaign_id) INTO v_ownership_check;
  IF NOT v_ownership_check THEN
    -- Return empty result if user doesn't own the campaign
    RETURN;
  END IF;

  -- Return aggregated analytics data
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT CASE 
      WHEN s.session_flag IN ('actual_session', 'engaged_session') 
      THEN s.session_id 
    END)::BIGINT as total_actual_sessions,
    COUNT(DISTINCT CASE 
      WHEN s.session_flag = 'engaged_session' 
      THEN s.session_id 
    END)::BIGINT as total_engaged_sessions,
    COALESCE(SUM(s.active_time_spent), 0)::BIGINT as total_time_spent
  FROM internal.sessions s
  WHERE s.campaign_id = p_campaign_id;
END;
$$;

-- Step 5: Grant execute permissions
-- Revoke public, anon access and grant only to authenticated users
REVOKE EXECUTE ON FUNCTION public.check_campaign_ownership(UUID) FROM public;
REVOKE EXECUTE ON FUNCTION public.get_campaign_analytics(UUID) FROM public;
REVOKE EXECUTE ON FUNCTION public.check_campaign_ownership(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_campaign_analytics(UUID) FROM anon;

GRANT EXECUTE ON FUNCTION public.check_campaign_ownership(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_campaign_analytics(UUID) TO authenticated;

-- Step 6: Add comments for documentation
COMMENT ON FUNCTION public.check_campaign_ownership(UUID) IS 'Checks if the current authenticated user owns the campaign. Returns true if user owns the project that contains the campaign.';
COMMENT ON FUNCTION public.get_campaign_analytics(UUID) IS 'Returns aggregated analytics data for a campaign. Only accessible by campaign owners. Returns total_actual_sessions, total_engaged_sessions, and total_time_spent (seconds).';
COMMENT ON VIEW public.campaign_analytics_view IS 'View that joins internal.sessions and internal.events for analytics queries. Access controlled via RPC functions with ownership checks.';

