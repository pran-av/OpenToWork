-- Fix get_campaign_analytics to use public.campaign_analytics_view
-- This avoids permission issues when authenticated users try to access internal.sessions

-- Revoke SELECT on the view from all roles (view should only be accessible through function)
-- The function will have ownership checks to ensure users only see their own campaign analytics
REVOKE SELECT ON public.campaign_analytics_view FROM public, anon, authenticated;

-- Grant SELECT on the view only to postgres (function owner needs this for SECURITY DEFINER)
-- This ensures only the function can query the view, not users directly
GRANT SELECT ON public.campaign_analytics_view TO postgres;

-- Update get_campaign_analytics to use SECURITY DEFINER and query the view
-- Note: We need to check ownership first, but auth.uid() doesn't work in DEFINER context
-- So we'll get the user ID from the JWT claim and check ownership manually
DROP FUNCTION IF EXISTS public.get_campaign_analytics(UUID);

CREATE OR REPLACE FUNCTION public.get_campaign_analytics(
  p_campaign_id UUID
) RETURNS TABLE (
  total_actual_sessions BIGINT,
  total_engaged_sessions BIGINT,
  total_time_spent BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
DECLARE
  v_user_id UUID;
  v_project_id UUID;
  v_owns_campaign boolean;
BEGIN
  -- Sanitize input
  IF p_campaign_id IS NULL THEN
    RETURN;
  END IF;

  -- Get user ID (auth.uid() works in DEFINER context when called with authenticated JWT)
  v_user_id := auth.uid();
  
  -- If no user ID, deny access
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Get project_id for the campaign
  SELECT project_id INTO v_project_id
  FROM public.campaigns
  WHERE campaign_id = p_campaign_id;

  IF v_project_id IS NULL THEN
    RETURN;
  END IF;

  -- Check if user owns the project
  SELECT EXISTS (
    SELECT 1
    FROM public.projects
    WHERE project_id = v_project_id
      AND user_id = v_user_id
  ) INTO v_owns_campaign;

  IF NOT v_owns_campaign THEN
    -- Return empty result if user doesn't own the campaign
    RETURN;
  END IF;

  -- Return aggregated analytics data using the view
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT CASE 
      WHEN v.session_flag IN ('actual_session', 'engaged_session') 
      THEN v.session_id 
    END)::BIGINT as total_actual_sessions,
    COUNT(DISTINCT CASE 
      WHEN v.session_flag = 'engaged_session' 
      THEN v.session_id 
    END)::BIGINT as total_engaged_sessions,
    COALESCE(SUM(v.active_time_spent), 0)::BIGINT as total_time_spent
  FROM public.campaign_analytics_view v
  WHERE v.campaign_id = p_campaign_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_campaign_analytics(UUID) TO authenticated;

-- Revoke from public and anon
REVOKE EXECUTE ON FUNCTION public.get_campaign_analytics(UUID) FROM public, anon;

