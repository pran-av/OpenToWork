-- Update get_analytics_session_for_flag_update to return event_count instead of has_events
-- This allows checking for more than one event (event_count > 1) for engaged_session flag

-- Drop the existing function first (can't change return type with CREATE OR REPLACE)
DROP FUNCTION IF EXISTS public.get_analytics_session_for_flag_update(UUID);

-- Recreate with new return type
CREATE FUNCTION public.get_analytics_session_for_flag_update(
  p_session_id UUID
) RETURNS TABLE (
  session_id UUID,
  active_time_spent INTEGER,
  session_flag internal.session_flag_enum,
  event_count INTEGER
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
    COALESCE(
      (SELECT COUNT(*)::INTEGER FROM internal.events e WHERE e.session_id = s.session_id),
      0
    ) as event_count
  FROM internal.sessions s
  WHERE s.session_id = p_session_id;
END;
$$;

-- Ensure execute permissions remain correct
-- Revoke from public, anon, and authenticated roles (worker-only functions)
REVOKE EXECUTE ON FUNCTION public.insert_analytics_event(UUID, UUID, internal.event_type_enum, TIMESTAMPTZ, JSONB) FROM public;
REVOKE EXECUTE ON FUNCTION public.insert_analytics_event(UUID, UUID, internal.event_type_enum, TIMESTAMPTZ, JSONB) FROM anon;
REVOKE EXECUTE ON FUNCTION public.insert_analytics_event(UUID, UUID, internal.event_type_enum, TIMESTAMPTZ, JSONB) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.update_analytics_session(UUID, INTEGER, internal.session_flag_enum) FROM public;
REVOKE EXECUTE ON FUNCTION public.update_analytics_session(UUID, INTEGER, internal.session_flag_enum) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_analytics_session(UUID, INTEGER, internal.session_flag_enum) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.get_analytics_session_for_flag_update(UUID) FROM public;
REVOKE EXECUTE ON FUNCTION public.get_analytics_session_for_flag_update(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_analytics_session_for_flag_update(UUID) FROM authenticated;

-- Note: These functions are intended for service role (Edge Function worker) use only

