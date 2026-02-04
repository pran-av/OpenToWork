-- Create RPC function to get session data for worker
-- This allows the worker to query internal.sessions via RPC instead of direct table access

CREATE OR REPLACE FUNCTION public.get_analytics_session(
  p_session_id UUID
) RETURNS TABLE (
  session_id UUID,
  started_at TIMESTAMPTZ,
  active_time_spent INTEGER,
  session_flag internal.session_flag_enum
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
    s.started_at,
    s.active_time_spent,
    s.session_flag
  FROM internal.sessions s
  WHERE s.session_id = p_session_id;
END;
$$;

-- Create RPC function to end expired sessions
CREATE OR REPLACE FUNCTION public.end_analytics_session(
  p_session_id UUID
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Sanitize input
  IF p_session_id IS NULL THEN
    RETURN false;
  END IF;

  -- Update session to set ended_at
  UPDATE internal.sessions
  SET ended_at = NOW()
  WHERE session_id = p_session_id;

  RETURN true;
END;
$$;

-- Revoke execute access from public, anon, and authenticated (worker-only functions)
REVOKE EXECUTE ON FUNCTION public.get_analytics_session(UUID) FROM public;
REVOKE EXECUTE ON FUNCTION public.get_analytics_session(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_analytics_session(UUID) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.end_analytics_session(UUID) FROM public;
REVOKE EXECUTE ON FUNCTION public.end_analytics_session(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.end_analytics_session(UUID) FROM authenticated;

-- Note: These functions are intended for service role (Edge Function worker) use only

