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

-- Step 2.5: Create RPC function for creating analytics sessions
-- This function allows inserting into internal.sessions with proper permissions
CREATE OR REPLACE FUNCTION public.create_analytics_session(
  p_session_id UUID,
  p_project_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_campaign_id UUID DEFAULT NULL,
  p_user_agent_hash TEXT DEFAULT NULL
) RETURNS TABLE (
  session_id UUID,
  campaign_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Sanitize inputs
  IF p_session_id IS NULL OR p_project_id IS NULL THEN
    RAISE EXCEPTION 'session_id and project_id are required';
  END IF;

  -- Insert session into internal.sessions
  INSERT INTO internal.sessions (
    session_id,
    user_id,
    project_id,
    campaign_id,
    user_agent_hash,
    started_at
  ) VALUES (
    p_session_id,
    p_user_id,
    p_project_id,
    p_campaign_id,
    p_user_agent_hash,
    NOW()
  )
  ON CONFLICT (session_id) DO NOTHING;

  -- Return the session data
  RETURN QUERY
  SELECT 
    s.session_id,
    s.campaign_id
  FROM internal.sessions s
  WHERE s.session_id = p_session_id;
END;
$$;

-- Grant execute permissions for session creation
-- Note: Parameter order: session_id, project_id, user_id, campaign_id, user_agent_hash
REVOKE EXECUTE ON FUNCTION public.create_analytics_session(UUID, UUID, UUID, UUID, TEXT) FROM public;
REVOKE EXECUTE ON FUNCTION public.create_analytics_session(UUID, UUID, UUID, UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_analytics_session(UUID, UUID, UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_analytics_session(UUID, UUID, UUID, UUID, TEXT) TO anon;

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

-- Step 6: Create RPC functions for worker to write to internal schema
-- These functions are used by the Edge Function worker to process events and heartbeats

-- Function to insert analytics event (used by worker)
CREATE OR REPLACE FUNCTION public.insert_analytics_event(
  p_event_id UUID,
  p_session_id UUID,
  p_event_type internal.event_type_enum,
  p_timestamp TIMESTAMPTZ,
  p_metadata JSONB DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Sanitize inputs
  IF p_event_id IS NULL OR p_session_id IS NULL OR p_event_type IS NULL OR p_timestamp IS NULL THEN
    RAISE EXCEPTION 'event_id, session_id, event_type, and timestamp are required';
  END IF;

  -- Insert event (UNIQUE constraint handles deduplication)
  INSERT INTO internal.events (
    event_id,
    session_id,
    event_type,
    metadata,
    timestamp
  ) VALUES (
    p_event_id,
    p_session_id,
    p_event_type,
    p_metadata,
    p_timestamp
  )
  ON CONFLICT (session_id, event_id) DO NOTHING;

  RETURN p_event_id;
END;
$$;

-- Function to update session time and flag (used by worker)
CREATE OR REPLACE FUNCTION public.update_analytics_session(
  p_session_id UUID,
  p_time_increment INTEGER DEFAULT 0,
  p_session_flag internal.session_flag_enum DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_current_time INTEGER;
  v_current_flag internal.session_flag_enum;
BEGIN
  -- Sanitize inputs
  IF p_session_id IS NULL THEN
    RETURN false;
  END IF;

  -- Get current session data
  SELECT active_time_spent, session_flag INTO v_current_time, v_current_flag
  FROM internal.sessions
  WHERE session_id = p_session_id;

  IF v_current_time IS NULL THEN
    RETURN false; -- Session not found
  END IF;

  -- Update session
  UPDATE internal.sessions
  SET 
    active_time_spent = v_current_time + COALESCE(p_time_increment, 0),
    session_flag = COALESCE(p_session_flag, v_current_flag),
    updated_at = NOW()
  WHERE session_id = p_session_id;

  RETURN true;
END;
$$;

-- Function to get session for flag update check (used by worker)
CREATE OR REPLACE FUNCTION public.get_analytics_session_for_flag_update(
  p_session_id UUID
) RETURNS TABLE (
  session_id UUID,
  active_time_spent INTEGER,
  session_flag internal.session_flag_enum,
  has_events BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.session_id,
    s.active_time_spent,
    s.session_flag,
    EXISTS(
      SELECT 1 FROM internal.events e WHERE e.session_id = s.session_id
    ) as has_events
  FROM internal.sessions s
  WHERE s.session_id = p_session_id;
END;
$$;

-- Grant execute permissions for worker functions (service role will use these)
REVOKE EXECUTE ON FUNCTION public.insert_analytics_event(UUID, UUID, internal.event_type_enum, TIMESTAMPTZ, JSONB) FROM public;
REVOKE EXECUTE ON FUNCTION public.insert_analytics_event(UUID, UUID, internal.event_type_enum, TIMESTAMPTZ, JSONB) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_analytics_session(UUID, INTEGER, internal.session_flag_enum) FROM public;
REVOKE EXECUTE ON FUNCTION public.update_analytics_session(UUID, INTEGER, internal.session_flag_enum) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_analytics_session_for_flag_update(UUID) FROM public;
REVOKE EXECUTE ON FUNCTION public.get_analytics_session_for_flag_update(UUID) FROM anon;

-- Note: These functions are intended for service role (Edge Function worker) use only
-- They are not granted to authenticated/anon as they should only be called by the worker

-- Step 7: Add comments for documentation
COMMENT ON FUNCTION public.check_campaign_ownership(UUID) IS 'Checks if the current authenticated user owns the campaign. Returns true if user owns the project that contains the campaign.';
COMMENT ON FUNCTION public.get_campaign_analytics(UUID) IS 'Returns aggregated analytics data for a campaign. Only accessible by campaign owners. Returns total_actual_sessions, total_engaged_sessions, and total_time_spent (seconds).';
COMMENT ON VIEW public.campaign_analytics_view IS 'View that joins internal.sessions and internal.events for analytics queries. Access controlled via RPC functions with ownership checks.';
COMMENT ON FUNCTION public.insert_analytics_event(UUID, UUID, internal.event_type_enum, TIMESTAMPTZ, JSONB) IS 'Inserts an analytics event into internal.events. Used by Edge Function worker. Handles deduplication via UNIQUE constraint.';
COMMENT ON FUNCTION public.update_analytics_session(UUID, INTEGER, internal.session_flag_enum) IS 'Updates session active_time_spent and optionally session_flag. Used by Edge Function worker for heartbeat processing.';
COMMENT ON FUNCTION public.get_analytics_session_for_flag_update(UUID) IS 'Gets session data needed for flag update logic. Returns session info including whether it has events. Used by Edge Function worker.';

