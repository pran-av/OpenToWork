-- Migration: Optimize RLS Policies and RPC Functions
-- This migration creates security definer functions in an internal schema
-- and updates RLS policies to require project_id for public access

-- Step 1: Create internal schema for security definer functions
CREATE SCHEMA IF NOT EXISTS internal;
GRANT USAGE ON SCHEMA internal TO authenticated;
/* GRANT USAGE ON SCHEMA internal TO anon; */

-- Step 2: Revoke execute access from public for existing security definer functions
REVOKE EXECUTE ON FUNCTION public.archive_project(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.publish_campaign(uuid, uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.switch_campaign(uuid, uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.prevent_project_unarchive() FROM public;
REVOKE EXECUTE ON FUNCTION public.handle_auth_user_update() FROM public;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM public;
REVOKE EXECUTE ON FUNCTION public.is_campaign_available_for_leads(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.is_campaign_publishable(uuid) FROM public;


-- Step 3: Create security definer functions for access checks
-- These functions can be used for validation or future RLS policy integration

-- Function to check campaign access by project_id
-- Allows owners OR non-owners viewing ACTIVE campaigns (with project_id)
-- RLS policies handle ownership checks separately, this is for additional validation if needed
CREATE OR REPLACE FUNCTION internal.check_campaign_access_by_project(
  p_campaign_id uuid,
  p_project_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
DECLARE
  v_campaign_status campaign_status_enum;
  v_campaign_project_id uuid;
  v_user_id uuid;
BEGIN
  -- Sanitize inputs
  IF p_campaign_id IS NULL OR p_project_id IS NULL THEN
    RETURN false;
  END IF;

  -- Get campaign details
  SELECT campaign_status, project_id INTO v_campaign_status, v_campaign_project_id
  FROM public.campaigns
  WHERE campaign_id = p_campaign_id;

  -- Campaign must exist and belong to the specified project
  IF v_campaign_project_id IS NULL OR v_campaign_project_id != p_project_id THEN
    RETURN false;
  END IF;

  -- Check ownership (RLS will also check this, but this allows OR logic)
  v_user_id := auth.uid();
  IF v_user_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.projects
      WHERE project_id = p_project_id AND user_id = v_user_id
    ) THEN
      RETURN true;
    END IF;
  END IF;

  -- Non-owners can view ACTIVE campaigns with project_id (ensures project_id is required)
  IF v_campaign_status = 'ACTIVE'::campaign_status_enum THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Function to check client_service access by project_id
-- Allows owners OR non-owners viewing ACTIVE campaigns (with project_id)
CREATE OR REPLACE FUNCTION internal.check_client_service_access_by_project(
  p_client_service_id uuid,
  p_project_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
DECLARE
  v_campaign_id uuid;
  v_campaign_status campaign_status_enum;
  v_user_id uuid;
BEGIN
  -- Sanitize inputs
  IF p_client_service_id IS NULL OR p_project_id IS NULL THEN
    RETURN false;
  END IF;

  -- Get campaign details through client_service
  SELECT cs.campaign_id, c.campaign_status INTO v_campaign_id, v_campaign_status
  FROM public.client_services cs
  JOIN public.campaigns c ON c.campaign_id = cs.campaign_id
  WHERE cs.client_service_id = p_client_service_id
    AND c.project_id = p_project_id;

  -- Client service must exist and belong to the specified project
  IF v_campaign_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check ownership (RLS will also check this, but this allows OR logic)
  v_user_id := auth.uid();
  IF v_user_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.projects
      WHERE project_id = p_project_id AND user_id = v_user_id
    ) THEN
      RETURN true;
    END IF;
  END IF;

  -- Non-owners can view client_services for ACTIVE campaigns with project_id
  IF v_campaign_status = 'ACTIVE'::campaign_status_enum THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Function to check case_study access by project_id
-- Allows owners OR non-owners viewing ACTIVE campaigns (with project_id)
CREATE OR REPLACE FUNCTION internal.check_case_study_access_by_project(
  p_case_id uuid,
  p_project_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
DECLARE
  v_campaign_id uuid;
  v_campaign_status campaign_status_enum;
  v_user_id uuid;
BEGIN
  -- Sanitize inputs
  IF p_case_id IS NULL OR p_project_id IS NULL THEN
    RETURN false;
  END IF;

  -- Get campaign details through case_study -> client_service -> campaign
  SELECT c.campaign_id, c.campaign_status INTO v_campaign_id, v_campaign_status
  FROM public.case_studies cs
  JOIN public.client_services clis ON clis.client_service_id = cs.client_service_id
  JOIN public.campaigns c ON c.campaign_id = clis.campaign_id
  WHERE cs.case_id = p_case_id
    AND c.project_id = p_project_id;

  -- Case study must exist and belong to the specified project
  IF v_campaign_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check ownership (RLS will also check this, but this allows OR logic)
  v_user_id := auth.uid();
  IF v_user_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.projects
      WHERE project_id = p_project_id AND user_id = v_user_id
    ) THEN
      RETURN true;
    END IF;
  END IF;

  -- Non-owners can view case_studies for ACTIVE campaigns with project_id
  IF v_campaign_status = 'ACTIVE'::campaign_status_enum THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Function to check widget access by project_id
-- Allows owners OR non-owners viewing ACTIVE campaigns (with project_id)
CREATE OR REPLACE FUNCTION internal.check_widget_access_by_project(
  p_widget_id uuid,
  p_project_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
DECLARE
  v_campaign_id uuid;
  v_campaign_status campaign_status_enum;
  v_user_id uuid;
BEGIN
  -- Sanitize inputs
  IF p_widget_id IS NULL OR p_project_id IS NULL THEN
    RETURN false;
  END IF;

  -- Get campaign details through widget
  SELECT w.campaign_id, c.campaign_status INTO v_campaign_id, v_campaign_status
  FROM public.widgets w
  JOIN public.campaigns c ON c.campaign_id = w.campaign_id
  WHERE w.widget_id = p_widget_id
    AND c.project_id = p_project_id;

  -- Widget must exist and belong to the specified project
  IF v_campaign_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check ownership (RLS will also check this, but this allows OR logic)
  v_user_id := auth.uid();
  IF v_user_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.projects
      WHERE project_id = p_project_id AND user_id = v_user_id
    ) THEN
      RETURN true;
    END IF;
  END IF;

  -- Non-owners can view widgets for ACTIVE campaigns with project_id
  IF v_campaign_status = 'ACTIVE'::campaign_status_enum THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Step 7: Create security definer function to check lead insert access by project_id
CREATE OR REPLACE FUNCTION internal.check_lead_insert_access_by_project(
  p_campaign_id uuid,
  p_project_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
DECLARE
  v_campaign_status campaign_status_enum;
  v_campaign_project_id uuid;
  v_user_id uuid;
BEGIN
  -- Sanitize inputs
  IF p_campaign_id IS NULL OR p_project_id IS NULL THEN
    RETURN false;
  END IF;

  -- Get campaign details
  SELECT campaign_status, project_id INTO v_campaign_status, v_campaign_project_id
  FROM campaigns
  WHERE campaign_id = p_campaign_id;

  -- Campaign must exist and belong to the specified project
  IF v_campaign_project_id IS NULL OR v_campaign_project_id != p_project_id THEN
    RETURN false;
  END IF;

  -- Check ownership (owners can always insert)
  v_user_id := auth.uid();
  IF v_user_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM projects
      WHERE project_id = p_project_id AND user_id = v_user_id
    ) THEN
      RETURN true;
    END IF;
  END IF;

  -- Public access: only allow insert if campaign is ACTIVE
  IF v_campaign_status = 'ACTIVE'::campaign_status_enum THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Step 8: Revoke execute access from public for all internal functions
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA internal FROM public;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA internal TO authenticated;
/* GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA internal TO anon; */

-- Step 9: Create RPC functions for public access that require project_id
-- These functions ensure project_id is mandatory for public queries

-- RPC function to get active campaign by project_id (public access)
CREATE OR REPLACE FUNCTION public.get_active_campaign_by_project(
  p_project_id uuid
) RETURNS TABLE (
  campaign_id uuid,
  project_id uuid,
  campaign_name varchar(25),
  campaign_status campaign_status_enum,
  campaign_structure jsonb,
  cta_config jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
BEGIN
  -- Sanitize input
  IF p_project_id IS NULL THEN
    RETURN;
  END IF;

  -- Return only ACTIVE campaign for the specified project
  -- Since there's a unique constraint, this will return at most one row
  RETURN QUERY
  SELECT 
    c.campaign_id,
    c.project_id,
    c.campaign_name,
    c.campaign_status,
    c.campaign_structure,
    c.cta_config,
    c.created_at
  FROM campaigns c
  WHERE c.project_id = p_project_id
    AND c.campaign_status = 'ACTIVE'::campaign_status_enum
  LIMIT 1;
END;
$$;

-- RPC function to get client services by project_id (public access)
CREATE OR REPLACE FUNCTION public.get_client_services_by_project(
  p_project_id uuid
) RETURNS TABLE (
  client_service_id uuid,
  campaign_id uuid,
  client_service_name varchar(100),
  order_index integer,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
BEGIN
  -- Sanitize input
  IF p_project_id IS NULL THEN
    RETURN;
  END IF;

  -- Return client services for ACTIVE campaign in the specified project
  RETURN QUERY
  SELECT 
    cs.client_service_id,
    cs.campaign_id,
    cs.client_service_name,
    cs.order_index,
    cs.created_at
  FROM client_services cs
  JOIN campaigns c ON c.campaign_id = cs.campaign_id
  WHERE c.project_id = p_project_id
    AND c.campaign_status = 'ACTIVE'::campaign_status_enum
  ORDER BY cs.order_index ASC;
END;
$$;

-- RPC function to get case studies by project_id (public access)
CREATE OR REPLACE FUNCTION public.get_case_studies_by_project(
  p_project_id uuid
) RETURNS TABLE (
  case_id uuid,
  client_service_id uuid,
  case_name varchar(100),
  case_summary text,
  case_duration varchar(50),
  case_highlights text,
  case_study_url text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
BEGIN
  -- Sanitize input
  IF p_project_id IS NULL THEN
    RETURN;
  END IF;

  -- Return case studies for ACTIVE campaign in the specified project
  RETURN QUERY
  SELECT 
    cs.case_id,
    cs.client_service_id,
    cs.case_name,
    cs.case_summary,
    cs.case_duration,
    cs.case_highlights,
    cs.case_study_url,
    cs.created_at
  FROM case_studies cs
  JOIN client_services clis ON clis.client_service_id = cs.client_service_id
  JOIN campaigns c ON c.campaign_id = clis.campaign_id
  WHERE c.project_id = p_project_id
    AND c.campaign_status = 'ACTIVE'::campaign_status_enum
  ORDER BY cs.created_at DESC;
END;
$$;

-- RPC function to get widgets by project_id (public access)
CREATE OR REPLACE FUNCTION public.get_widgets_by_project(
  p_project_id uuid
) RETURNS TABLE (
  widget_id uuid,
  campaign_id uuid,
  widget_name varchar(100),
  is_active boolean,
  widget_text text,
  design_attributes jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
BEGIN
  -- Sanitize input
  IF p_project_id IS NULL THEN
    RETURN;
  END IF;

  -- Return widgets for ACTIVE campaign in the specified project
  RETURN QUERY
  SELECT 
    w.widget_id,
    w.campaign_id,
    w.widget_name,
    w.is_active,
    w.widget_text,
    w.design_attributes,
    w.created_at
  FROM widgets w
  JOIN campaigns c ON c.campaign_id = w.campaign_id
  WHERE c.project_id = p_project_id
    AND c.campaign_status = 'ACTIVE'::campaign_status_enum;
END;
$$;

-- Revoke execute from public for RPC functions
REVOKE EXECUTE ON FUNCTION public.get_active_campaign_by_project(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.get_client_services_by_project(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.get_case_studies_by_project(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.get_widgets_by_project(uuid) FROM public;

-- Grant execute to authenticated (for public project URLs)
-- Authenticated users can use these to access other users' campaigns via project_url
GRANT EXECUTE ON FUNCTION public.get_active_campaign_by_project(uuid) TO authenticated;
/* GRANT EXECUTE ON FUNCTION public.get_active_campaign_by_project(uuid) TO anon; */
GRANT EXECUTE ON FUNCTION public.get_client_services_by_project(uuid) TO authenticated;
/* GRANT EXECUTE ON FUNCTION public.get_client_services_by_project(uuid) TO anon; */
GRANT EXECUTE ON FUNCTION public.get_case_studies_by_project(uuid) TO authenticated;
/* GRANT EXECUTE ON FUNCTION public.get_case_studies_by_project(uuid) TO anon; */
GRANT EXECUTE ON FUNCTION public.get_widgets_by_project(uuid) TO authenticated;
/* GRANT EXECUTE ON FUNCTION public.get_widgets_by_project(uuid) TO anon; */

-- Step 10: Update RLS policies to remove is_archived checks and enforce RPC usage for public access
-- 
-- RLS Policy Strategy (Option C):
-- 1. Ownership policies (campaigns_select_own, etc.) allow authenticated users to access their own data via direct queries
-- 2. Public policies deny all direct table access (set to false), forcing RPC function usage
-- 3. RPC functions require project_id parameter, ensuring security for public/non-ownership access
-- 4. Authenticated users accessing other users' campaigns (via project_url) must use RPC functions
--
-- Note: RLS policies use OR logic - if ANY policy allows access, the row is accessible.
-- So ownership policies will still work for authenticated users' own data.

-- Drop old public policies
DROP POLICY IF EXISTS "campaigns_select_public_active" ON "public"."campaigns";
DROP POLICY IF EXISTS "client_services_select_public" ON "public"."client_services";
DROP POLICY IF EXISTS "case_studies_select_public" ON "public"."case_studies";
DROP POLICY IF EXISTS "widgets_select_public" ON "public"."widgets";

-- Campaigns: Deny public direct access, force RPC function usage
-- Ownership access is handled by campaigns_select_own policy (allows direct queries for own data)
-- For public/non-ownership access, use get_active_campaign_by_project RPC function
CREATE POLICY "campaigns_select_public_active" ON "public"."campaigns"
FOR SELECT
TO anon, authenticated
USING (false);  -- Deny all direct public access, must use RPC function

-- Client Services: Deny public direct access, force RPC function usage
-- Ownership access is handled by client_services_select_own policy
-- For public/non-ownership access, use get_client_services_by_project RPC function
CREATE POLICY "client_services_select_public" ON "public"."client_services"
FOR SELECT
TO anon, authenticated
USING (false);  -- Deny all direct public access, must use RPC function

-- Case Studies: Deny public direct access, force RPC function usage
-- Ownership access is handled by case_studies_select_own policy
-- For public/non-ownership access, use get_case_studies_by_project RPC function
CREATE POLICY "case_studies_select_public" ON "public"."case_studies"
FOR SELECT
TO anon, authenticated
USING (false);  -- Deny all direct public access, must use RPC function

-- Widgets: Deny public direct access, force RPC function usage
-- Ownership access is handled by widgets_select_own policy
-- For public/non-ownership access, use get_widgets_by_project RPC function
CREATE POLICY "widgets_select_public" ON "public"."widgets"
FOR SELECT
TO anon, authenticated
USING (false);  -- Deny all direct public access, must use RPC function

-- Leads: Update INSERT policy
DROP POLICY IF EXISTS "leads_insert_public" ON "public"."leads";
CREATE POLICY "leads_insert_public" ON "public"."leads"
FOR INSERT
TO anon, authenticated
WITH CHECK (
  -- Ownership: users can always insert leads for their own campaigns
  (EXISTS (
    SELECT 1
    FROM campaigns
    JOIN projects ON projects.project_id = campaigns.project_id
    WHERE campaigns.campaign_id = leads.campaign_id
      AND projects.user_id = (select auth.uid())
  ))
  OR
  -- Public access: campaign must be ACTIVE
  (EXISTS (
    SELECT 1
    FROM campaigns
    WHERE campaigns.campaign_id = leads.campaign_id
      AND campaigns.campaign_status = 'ACTIVE'::campaign_status_enum
  ))
);

-- Step 11: Remove is_archived checks from ownership policies
-- (The archive_project function ensures no active campaigns exist in archived projects)

-- Update client_services policies to remove is_archived check
DROP POLICY IF EXISTS "client_services_insert_own" ON "public"."client_services";
CREATE POLICY "client_services_insert_own" ON "public"."client_services"
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM campaigns
    JOIN projects ON projects.project_id = campaigns.project_id
    WHERE campaigns.campaign_id = client_services.campaign_id
      AND projects.user_id = (select auth.uid())
  )
);

DROP POLICY IF EXISTS "client_services_update_own" ON "public"."client_services";
CREATE POLICY "client_services_update_own" ON "public"."client_services"
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM campaigns
    JOIN projects ON projects.project_id = campaigns.project_id
    WHERE campaigns.campaign_id = client_services.campaign_id
      AND projects.user_id = (select auth.uid())
  )
);

-- Update case_studies policies to remove is_archived check
DROP POLICY IF EXISTS "case_studies_insert_own" ON "public"."case_studies";
CREATE POLICY "case_studies_insert_own" ON "public"."case_studies"
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM client_services
    JOIN campaigns ON campaigns.campaign_id = client_services.campaign_id
    JOIN projects ON projects.project_id = campaigns.project_id
    WHERE client_services.client_service_id = case_studies.client_service_id
      AND projects.user_id = (select auth.uid())
  )
);

DROP POLICY IF EXISTS "case_studies_update_own" ON "public"."case_studies";
CREATE POLICY "case_studies_update_own" ON "public"."case_studies"
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM client_services
    JOIN campaigns ON campaigns.campaign_id = client_services.campaign_id
    JOIN projects ON projects.project_id = campaigns.project_id
    WHERE client_services.client_service_id = case_studies.client_service_id
      AND projects.user_id = (select auth.uid())
  )
);

-- Update widgets policies to remove is_archived check
DROP POLICY IF EXISTS "widgets_insert_own" ON "public"."widgets";
CREATE POLICY "widgets_insert_own" ON "public"."widgets"
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM campaigns
    JOIN projects ON projects.project_id = campaigns.project_id
    WHERE campaigns.campaign_id = widgets.campaign_id
      AND projects.user_id = (select auth.uid())
  )
);

DROP POLICY IF EXISTS "widgets_update_own" ON "public"."widgets";
CREATE POLICY "widgets_update_own" ON "public"."widgets"
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM campaigns
    JOIN projects ON projects.project_id = campaigns.project_id
    WHERE campaigns.campaign_id = widgets.campaign_id
      AND projects.user_id = (select auth.uid())
  )
);

-- Update campaigns update policy to remove is_archived check
DROP POLICY IF EXISTS "campaigns_update_own" ON "public"."campaigns";
CREATE POLICY "campaigns_update_own" ON "public"."campaigns"
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM projects
    WHERE project_id = campaigns.project_id
      AND user_id = (select auth.uid())
  )
);
