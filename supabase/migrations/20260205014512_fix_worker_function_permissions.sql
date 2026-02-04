-- Fix worker function permissions
-- Problem: SECURITY DEFINER functions run as postgres, which may not have internal schema access
-- Solution: Use SECURITY INVOKER so functions run as caller (service_role from Edge Function)
-- The service_role has broader permissions in Supabase

-- First, grant service_role access to internal schema and tables
GRANT USAGE ON SCHEMA internal TO service_role;
GRANT SELECT, INSERT, UPDATE ON internal.sessions TO service_role;
GRANT SELECT, INSERT ON internal.events TO service_role;

-- Recreate insert_analytics_event as SECURITY INVOKER
DROP FUNCTION IF EXISTS public.insert_analytics_event(UUID, UUID, internal.event_type_enum, TIMESTAMPTZ, JSONB);

CREATE FUNCTION public.insert_analytics_event(
  p_event_id UUID,
  p_session_id UUID,
  p_event_type internal.event_type_enum,
  p_timestamp TIMESTAMPTZ,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO internal.events (event_id, session_id, event_type, metadata, timestamp)
  VALUES (p_event_id, p_session_id, p_event_type, p_metadata, p_timestamp)
  ON CONFLICT ON CONSTRAINT events_session_event_unique DO NOTHING
  RETURNING event_id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$;

-- Recreate update_analytics_session as SECURITY INVOKER
DROP FUNCTION IF EXISTS public.update_analytics_session(UUID, INTEGER, internal.session_flag_enum);

CREATE FUNCTION public.update_analytics_session(
  p_session_id UUID,
  p_time_increment INTEGER,
  p_session_flag internal.session_flag_enum DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  UPDATE internal.sessions s
  SET 
    active_time_spent = s.active_time_spent + COALESCE(p_time_increment, 0),
    session_flag = COALESCE(p_session_flag, s.session_flag),
    updated_at = NOW()
  WHERE s.session_id = p_session_id;
  
  RETURN FOUND;
END;
$$;

-- Recreate get_analytics_session_for_flag_update as SECURITY INVOKER
DROP FUNCTION IF EXISTS public.get_analytics_session_for_flag_update(UUID);

CREATE FUNCTION public.get_analytics_session_for_flag_update(
  p_session_id UUID
)
RETURNS TABLE (
  session_id UUID,
  active_time_spent INTEGER,
  session_flag internal.session_flag_enum,
  event_count INTEGER
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.session_id,
    s.active_time_spent,
    s.session_flag,
    COALESCE(
      (SELECT COUNT(*)::INTEGER FROM internal.events e WHERE e.session_id = s.session_id),
      0
    ) as event_count
  FROM internal.sessions s
  WHERE s.session_id = p_session_id;
END;
$$;

-- Recreate get_analytics_session as SECURITY INVOKER
DROP FUNCTION IF EXISTS public.get_analytics_session(UUID);

CREATE FUNCTION public.get_analytics_session(
  p_session_id UUID
)
RETURNS TABLE (
  session_id UUID,
  user_id UUID,
  project_id UUID,
  campaign_id UUID,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  active_time_spent INTEGER,
  user_agent_hash TEXT,
  session_flag internal.session_flag_enum
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.session_id,
    s.user_id,
    s.project_id,
    s.campaign_id,
    s.started_at,
    s.ended_at,
    s.active_time_spent,
    s.user_agent_hash,
    s.session_flag
  FROM internal.sessions s
  WHERE s.session_id = p_session_id;
END;
$$;

-- Recreate end_analytics_session as SECURITY INVOKER
DROP FUNCTION IF EXISTS public.end_analytics_session(UUID);

CREATE FUNCTION public.end_analytics_session(
  p_session_id UUID
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  UPDATE internal.sessions
  SET ended_at = NOW(), updated_at = NOW()
  WHERE session_id = p_session_id AND ended_at IS NULL;
  
  RETURN FOUND;
END;
$$;

-- Revoke execute from public roles (these are worker-only functions)
REVOKE EXECUTE ON FUNCTION public.insert_analytics_event(UUID, UUID, internal.event_type_enum, TIMESTAMPTZ, JSONB) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_analytics_session(UUID, INTEGER, internal.session_flag_enum) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_analytics_session_for_flag_update(UUID) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_analytics_session(UUID) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.end_analytics_session(UUID) FROM public, anon, authenticated;

-- Grant execute to service_role only (used by Edge Functions)
GRANT EXECUTE ON FUNCTION public.insert_analytics_event(UUID, UUID, internal.event_type_enum, TIMESTAMPTZ, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_analytics_session(UUID, INTEGER, internal.session_flag_enum) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_analytics_session_for_flag_update(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_analytics_session(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.end_analytics_session(UUID) TO service_role;

