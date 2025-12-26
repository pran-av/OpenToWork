-- Migration: Fix Lead Insert for Anonymous Users
-- This migration updates check_lead_insert_allowed to properly handle anonymous authenticated users
-- 
-- Context:
-- - Campaign Flow pages authenticate users using JWT fingerprinting before they submit a link
-- - From database context, every user that attempts to Insert Link is 'authenticated' (has auth.uid())
-- - Anonymous Sign Ins can be identified with is_anonymous = true flag from their JWT payload
-- - We need to allow anonymous users (is_anonymous = true) to insert leads for ACTIVE campaigns
--
-- Solution:
-- - Use auth.jwt() ->> 'is_anonymous' to check if user is anonymously authenticated
-- - If is_anonymous = true, allow insert for ACTIVE campaigns (no ownership check needed)
-- - If is_anonymous = false (permanent user), check ownership first, then allow for ACTIVE campaigns

CREATE OR REPLACE FUNCTION internal.check_lead_insert_allowed(
  p_campaign_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
DECLARE
  v_campaign_status public.campaign_status_enum;
  v_project_id uuid;
  v_user_id uuid;
  v_is_anonymous boolean;
BEGIN
  -- Sanitize input
  IF p_campaign_id IS NULL THEN
    RETURN false;
  END IF;

  -- Get campaign details (security definer allows this even if user can't SELECT campaigns)
  SELECT campaign_status, project_id INTO v_campaign_status, v_project_id
  FROM public.campaigns
  WHERE campaign_id = p_campaign_id;

  -- Campaign must exist
  IF v_campaign_status IS NULL THEN
    RETURN false;
  END IF;

  -- Get user ID and check if user is anonymous from JWT
  v_user_id := auth.uid();
  
  -- Check is_anonymous claim from JWT
  -- auth.jwt() returns the JWT as JSONB, ->> extracts value as text, cast to boolean
  -- Returns NULL if JWT doesn't have is_anonymous claim or user is not authenticated
  v_is_anonymous := (auth.jwt() ->> 'is_anonymous')::boolean;
  
  -- If user is authenticated (has user_id)
  IF v_user_id IS NOT NULL THEN
    -- Check if this is an anonymous authenticated user
    IF v_is_anonymous = true THEN
      -- Anonymous authenticated users can insert leads for ACTIVE campaigns
      -- No ownership check needed - they're public users accessing via project_url
      IF v_campaign_status = 'ACTIVE'::public.campaign_status_enum THEN
        RETURN true;
      END IF;
      RETURN false;
    END IF;
    
    -- Permanent authenticated user - check ownership first
    IF EXISTS (
      SELECT 1
      FROM public.projects
      WHERE project_id = v_project_id AND user_id = v_user_id
    ) THEN
      -- Owner can always insert (regardless of campaign status)
      RETURN true;
    END IF;
  END IF;

  -- Public access (unauthenticated or anonymous): only allow insert if campaign is ACTIVE
  -- This handles edge cases where user might not have is_anonymous claim
  IF v_campaign_status = 'ACTIVE'::public.campaign_status_enum THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;
