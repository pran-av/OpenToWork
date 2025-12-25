-- Migration: Fix Anonymous User Access and Lead Creation
-- This migration fixes two issues:
-- 1. Grants execute permissions to anon role for RPC functions (enables case studies visibility)
-- 2. Creates security definer function for leads INSERT RLS policy (fixes lead creation for anonymous users)

-- Step 1: Grant execute permissions to anon role for RPC functions
-- This enables anonymous users to access public project pages via RPC functions
GRANT EXECUTE ON FUNCTION public.get_active_campaign_by_project(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_client_services_by_project(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_case_studies_by_project(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_widgets_by_project(uuid) TO anon;

-- Step 2: Create security definer function to check if lead insert is allowed
-- This function can query campaigns table even when user can't SELECT from it
-- Used in RLS policy for leads INSERT to validate campaign status
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

  -- Check ownership (owners can always insert)
  v_user_id := auth.uid();
  IF v_user_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.projects
      WHERE project_id = v_project_id AND user_id = v_user_id
    ) THEN
      RETURN true;
    END IF;
  END IF;

  -- Public access: only allow insert if campaign is ACTIVE
  IF v_campaign_status = 'ACTIVE'::public.campaign_status_enum THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Step 3: Grant execute on internal function to authenticated and anon
-- RLS policies need users to be able to invoke the function (even though it's SECURITY DEFINER)
GRANT EXECUTE ON FUNCTION internal.check_lead_insert_allowed(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION internal.check_lead_insert_allowed(uuid) TO anon;

-- Step 4: Update leads INSERT policy to use security definer function
-- This allows the policy to check campaign status even when user can't SELECT campaigns
DROP POLICY IF EXISTS "leads_insert_public" ON "public"."leads";
CREATE POLICY "leads_insert_public" ON "public"."leads"
FOR INSERT
TO anon, authenticated
WITH CHECK (
  -- Use security definer function to check if lead insert is allowed
  -- This function can query campaigns even when user can't SELECT from campaigns table
  (SELECT internal.check_lead_insert_allowed(leads.campaign_id))
);
