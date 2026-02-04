-- Fix permissions for analytics RPC functions
-- The issue: SECURITY DEFINER functions need their owner to have USAGE on internal schema
-- Even though functions are owned by postgres by default, we need to ensure permissions

-- Grant USAGE on internal schema to postgres (function owner)
-- Postgres should already have this, but ensuring it's explicit
DO $$
BEGIN
  -- Grant USAGE if not already granted
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.role_table_grants 
    WHERE grantee = 'postgres' AND table_schema = 'internal' AND privilege_type = 'USAGE'
  ) THEN
    GRANT USAGE ON SCHEMA internal TO postgres;
  END IF;
END $$;

-- Ensure functions are owned by postgres (they should be by default, but making explicit)
-- Use DO block to handle cases where functions might not exist yet
DO $$
BEGIN
  -- Set ownership for each function if it exists
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'insert_analytics_event' AND pronamespace = 'public'::regnamespace) THEN
    ALTER FUNCTION public.insert_analytics_event(UUID, UUID, internal.event_type_enum, TIMESTAMPTZ, JSONB) OWNER TO postgres;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_analytics_session' AND pronamespace = 'public'::regnamespace) THEN
    ALTER FUNCTION public.update_analytics_session(UUID, INTEGER, internal.session_flag_enum) OWNER TO postgres;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_analytics_session_for_flag_update' AND pronamespace = 'public'::regnamespace) THEN
    ALTER FUNCTION public.get_analytics_session_for_flag_update(UUID) OWNER TO postgres;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_analytics_session' AND pronamespace = 'public'::regnamespace) THEN
    ALTER FUNCTION public.get_analytics_session(UUID) OWNER TO postgres;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'end_analytics_session' AND pronamespace = 'public'::regnamespace) THEN
    ALTER FUNCTION public.end_analytics_session(UUID) OWNER TO postgres;
  END IF;
END $$;

-- Grant necessary table permissions to postgres (function owner needs INSERT/UPDATE/SELECT)
GRANT SELECT, INSERT, UPDATE ON internal.sessions TO postgres;
GRANT SELECT, INSERT ON internal.events TO postgres;

-- Note: SECURITY DEFINER functions run with the privileges of the function owner (postgres)
-- Postgres role now has USAGE on schema and permissions on tables

