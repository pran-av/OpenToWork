-- Migration: Fix Analytics Functions (UUIDv7, Conflict Targets, Ambiguity)
-- This migration updates existing analytics-related functions to:
-- - Use UUIDv7-compatible session IDs (already handled in app code)
-- - Fix ON CONFLICT clauses to use named constraints
-- - Remove ambiguous column references for session_id
--
-- Note: This migration assumes that the initial analytics functions
--       migration (20260202220416_create_analytics_functions.sql) has run.

-- Step 1: Update create_analytics_session function
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
  ON CONFLICT ON CONSTRAINT sessions_session_id_unique DO NOTHING;

  -- Return the session data
  RETURN QUERY
  SELECT 
    s.session_id,
    s.campaign_id
  FROM internal.sessions s
  WHERE s.session_id = p_session_id;
END;
$$;

-- Step 2: Update insert_analytics_event function
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
  ON CONFLICT ON CONSTRAINT events_session_event_unique DO NOTHING;

  RETURN p_event_id;
END;
$$;

-- Step 3: Update update_analytics_session function
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
  FROM internal.sessions s
  WHERE s.session_id = p_session_id;

  IF v_current_time IS NULL THEN
    RETURN false; -- Session not found
  END IF;

  -- Update session
  UPDATE internal.sessions s
  SET 
    active_time_spent = v_current_time + COALESCE(p_time_increment, 0),
    session_flag = COALESCE(p_session_flag, v_current_flag),
    updated_at = NOW()
  WHERE s.session_id = p_session_id;

  RETURN true;
END;
$$;

-- Step 4: Update get_analytics_session_for_flag_update function (no logic change, just ensure latest definition)
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

-- Step 5: Ensure execute permissions remain correct
REVOKE EXECUTE ON FUNCTION public.insert_analytics_event(UUID, UUID, internal.event_type_enum, TIMESTAMPTZ, JSONB) FROM public;
REVOKE EXECUTE ON FUNCTION public.insert_analytics_event(UUID, UUID, internal.event_type_enum, TIMESTAMPTZ, JSONB) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_analytics_session(UUID, INTEGER, internal.session_flag_enum) FROM public;
REVOKE EXECUTE ON FUNCTION public.update_analytics_session(UUID, INTEGER, internal.session_flag_enum) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_analytics_session_for_flag_update(UUID) FROM public;
REVOKE EXECUTE ON FUNCTION public.get_analytics_session_for_flag_update(UUID) FROM anon;

-- Note: These functions are intended for service role (Edge Function worker) use only


