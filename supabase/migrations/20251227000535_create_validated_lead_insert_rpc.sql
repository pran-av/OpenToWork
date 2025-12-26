-- Migration: Create Validated Lead Insert RPC Function
-- This migration creates a public RPC function that validates and inserts leads atomically
-- 
-- Strategy:
-- 1. Create public RPC function insert_lead_validated() that:
--    - Validates using internal.check_lead_insert_allowed()
--    - Inserts lead atomically if validation passes
--    - Returns the inserted lead or error
-- 2. Set RLS policy to false (deny all direct inserts)
-- 3. Grant execute permissions to authenticated and anon roles
--
-- This ensures validation cannot be bypassed and all inserts go through the RPC function

-- Step 1: Create public RPC function for validated lead insertion
CREATE OR REPLACE FUNCTION public.insert_lead_validated(
  p_campaign_id uuid,
  p_lead_name varchar,
  p_lead_company varchar,
  p_lead_email varchar,
  p_lead_phone_isd varchar DEFAULT NULL,
  p_lead_phone varchar DEFAULT NULL,
  p_meeting_scheduled boolean DEFAULT false
) RETURNS TABLE (
  lead_id uuid,
  campaign_id uuid,
  lead_name varchar,
  lead_company varchar,
  lead_email varchar,
  lead_phone_isd varchar,
  lead_phone varchar,
  meeting_scheduled boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_validation_passed boolean;
BEGIN
  -- Sanitize inputs
  IF p_campaign_id IS NULL OR p_lead_name IS NULL OR p_lead_company IS NULL OR p_lead_email IS NULL THEN
    RAISE EXCEPTION 'Missing required fields: campaign_id, lead_name, lead_company, lead_email';
  END IF;

  -- Validate using internal security definer function
  -- This checks campaign status, ownership, and is_anonymous flag
  SELECT internal.check_lead_insert_allowed(p_campaign_id) INTO v_validation_passed;
  
  IF NOT v_validation_passed THEN
    RAISE EXCEPTION 'Lead insert not allowed: Campaign may not exist, may not be ACTIVE, or user may not have permission';
  END IF;

  -- Insert lead atomically (validation passed) and return directly
  -- Use RETURNING * to avoid ambiguous column references
  RETURN QUERY
  INSERT INTO public.leads (
    campaign_id,
    lead_name,
    lead_company,
    lead_email,
    lead_phone_isd,
    lead_phone,
    meeting_scheduled
  ) VALUES (
    p_campaign_id,
    p_lead_name,
    p_lead_company,
    p_lead_email,
    p_lead_phone_isd,
    p_lead_phone,
    p_meeting_scheduled
  )
  RETURNING *;
END;
$$;

-- Step 2: Revoke public execution access and grant to specific roles
-- Revoke from public for security (explicit permission model)
REVOKE EXECUTE ON FUNCTION public.insert_lead_validated(uuid, varchar, varchar, varchar, varchar, varchar, boolean) FROM public;

-- Grant execute permissions to authenticated and anon roles
GRANT EXECUTE ON FUNCTION public.insert_lead_validated(uuid, varchar, varchar, varchar, varchar, varchar, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_lead_validated(uuid, varchar, varchar, varchar, varchar, varchar, boolean) TO anon;

-- Step 3: Update RLS policy to deny all direct inserts
-- All inserts must go through the RPC function which performs validation
DROP POLICY IF EXISTS "leads_insert_public" ON "public"."leads";
CREATE POLICY "leads_insert_public" ON "public"."leads"
FOR INSERT
TO anon, authenticated
WITH CHECK (false);  -- Deny all direct inserts, must use RPC function

-- Step 4: Set search_path = '' for functions with mutable search_path
-- This prevents search_path injection attacks and ensures explicit schema qualification

-- 1. prevent_project_unarchive
CREATE OR REPLACE FUNCTION public.prevent_project_unarchive() RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- If trying to change is_archived from TRUE to FALSE, raise error
  IF OLD.is_archived = TRUE AND NEW.is_archived = FALSE THEN
    RAISE EXCEPTION 'Cannot unarchive a project. Once archived, a project cannot be activated again.';
  END IF;
  RETURN NEW;
END;
$$;

-- 2. archive_project
CREATE OR REPLACE FUNCTION public.archive_project(p_project_id uuid) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_is_already_archived BOOLEAN;
BEGIN
  -- Check if already archived
  SELECT is_archived INTO v_is_already_archived
  FROM public.projects
  WHERE project_id = p_project_id;

  IF v_is_already_archived THEN
    RETURN jsonb_build_object('success', false, 'error', 'Project is already archived');
  END IF;

  -- Pause all ACTIVE campaigns and archive project in single transaction
  UPDATE public.campaigns SET campaign_status = 'PAUSED'::public.campaign_status_enum
  WHERE project_id = p_project_id AND campaign_status = 'ACTIVE'::public.campaign_status_enum;
  
  UPDATE public.projects SET is_archived = TRUE WHERE project_id = p_project_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 3. handle_auth_user_update
CREATE OR REPLACE FUNCTION public.handle_auth_user_update() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Update public.users when auth.users is updated (e.g., login, email verification)
  UPDATE public.users
  SET 
    user_email = NEW.email,
    is_email_verified = NEW.email_confirmed_at IS NOT NULL,
    last_login_at = COALESCE(NEW.last_sign_in_at, last_login_at, NOW())
  WHERE user_id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- 4. is_campaign_publishable
CREATE OR REPLACE FUNCTION public.is_campaign_publishable(p_campaign_id uuid) RETURNS boolean
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_has_client_name BOOLEAN;
  v_has_client_summary BOOLEAN;
  v_has_cta BOOLEAN;
  v_has_services BOOLEAN;
  v_all_services_have_cases BOOLEAN;
BEGIN
  -- Check client_name and client_summary in campaign_structure
  SELECT 
    (campaign_structure->>'client_name') IS NOT NULL 
    AND (campaign_structure->>'client_name') != '',
    (campaign_structure->>'client_summary') IS NOT NULL 
    AND (campaign_structure->>'client_summary') != ''
  INTO v_has_client_name, v_has_client_summary
  FROM public.campaigns
  WHERE campaign_id = p_campaign_id;

  IF NOT v_has_client_name OR NOT v_has_client_summary THEN
    RETURN FALSE;
  END IF;

  -- Check if at least one CTA exists
  SELECT 
    (cta_config->>'schedule_meeting') IS NOT NULL 
    OR (cta_config->>'mailto') IS NOT NULL 
    OR (cta_config->>'linkedin') IS NOT NULL 
    OR (cta_config->>'phone') IS NOT NULL
  INTO v_has_cta
  FROM public.campaigns
  WHERE campaign_id = p_campaign_id;

  IF NOT v_has_cta THEN
    RETURN FALSE;
  END IF;

  -- Check if at least one service exists
  SELECT EXISTS(
    SELECT 1 FROM public.client_services WHERE campaign_id = p_campaign_id
  ) INTO v_has_services;

  IF NOT v_has_services THEN
    RETURN FALSE;
  END IF;

  -- Check if all services have at least one case study
  SELECT NOT EXISTS(
    SELECT 1 
    FROM public.client_services cs
    WHERE cs.campaign_id = p_campaign_id
    AND NOT EXISTS(
      SELECT 1 FROM public.case_studies WHERE client_service_id = cs.client_service_id
    )
  ) INTO v_all_services_have_cases;

  RETURN v_all_services_have_cases;
END;
$$;

-- 5. publish_campaign
CREATE OR REPLACE FUNCTION public.publish_campaign(p_project_id uuid, p_campaign_id uuid) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_project_user_id UUID;
  v_campaign_project_id UUID;
  v_campaign_status public.campaign_status_enum;
  v_active_campaign_id UUID;
  v_project_url TEXT;
  v_is_publishable BOOLEAN;
BEGIN
  -- Verify campaign belongs to project
  SELECT project_id, campaign_status INTO v_campaign_project_id, v_campaign_status
  FROM public.campaigns
  WHERE campaign_id = p_campaign_id;

  IF v_campaign_project_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Campaign not found');
  END IF;

  IF v_campaign_project_id != p_project_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Campaign does not belong to project');
  END IF;

  -- Check if campaign is in DRAFT status
  IF v_campaign_status != 'DRAFT'::public.campaign_status_enum THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only DRAFT campaigns can be published');
  END IF;

  -- Check if there's already an ACTIVE campaign
  SELECT campaign_id INTO v_active_campaign_id
  FROM public.campaigns
  WHERE project_id = p_project_id AND campaign_status = 'ACTIVE'::public.campaign_status_enum
  LIMIT 1;

  IF v_active_campaign_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Project already has an ACTIVE campaign. Use switch_campaign instead.');
  END IF;

  -- Check if campaign is publishable
  SELECT public.is_campaign_publishable(p_campaign_id) INTO v_is_publishable;
  
  IF NOT v_is_publishable THEN
    RETURN jsonb_build_object('success', false, 'error', 'Campaign is not publishable. Ensure all mandatory fields are filled.');
  END IF;

  -- Verify project is not archived
  SELECT user_id INTO v_project_user_id
  FROM public.projects
  WHERE project_id = p_project_id AND is_archived = FALSE;

  IF v_project_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Project is archived');
  END IF;

  -- Generate project URL if not exists
  v_project_url := '/project/' || p_project_id::TEXT;

  -- Update campaign to ACTIVE and set project URL in single transaction
  UPDATE public.campaigns SET campaign_status = 'ACTIVE'::public.campaign_status_enum WHERE campaign_id = p_campaign_id;
  UPDATE public.projects SET project_url = v_project_url WHERE project_id = p_project_id AND project_url IS NULL;

  RETURN jsonb_build_object('success', true, 'project_url', v_project_url);
END;
$$;

-- 6. handle_new_auth_user
CREATE OR REPLACE FUNCTION public.handle_new_auth_user() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_existing_user_id UUID;
  v_user_email TEXT;
BEGIN
  -- Skip anonymous users - they don't need to be in public.users
  -- Anonymous users are only used for RLS via JWT, not for ownership chains
  IF NEW.is_anonymous = TRUE THEN
    RAISE NOTICE 'Skipping sync for anonymous user: %', NEW.id;
    RETURN NEW;
  END IF;

  -- Handle users without email (shouldn't happen for non-anonymous, but safety check)
  IF NEW.email IS NULL OR NEW.email = '' THEN
    -- This shouldn't happen for non-anonymous users, but log and skip if it does
    RAISE NOTICE 'Skipping sync for user without email: %', NEW.id;
    RETURN NEW;
  END IF;

  -- Use the actual email for non-anonymous users
  v_user_email := NEW.email;

  -- Check if user already exists by email (to handle email-based duplicates)
  SELECT user_id INTO v_existing_user_id
  FROM public.users
  WHERE user_email = v_user_email
  LIMIT 1;

  IF v_existing_user_id IS NOT NULL THEN
    -- User exists by email - update with auth.users.id and sync data
    UPDATE public.users
    SET 
      user_id = NEW.id,  -- Update FK to match auth.users.id
      user_email = v_user_email,
      is_email_verified = NEW.email_confirmed_at IS NOT NULL,
      last_login_at = COALESCE(NEW.last_sign_in_at, NOW()),
      -- Only update created_at if it's null (preserve original creation time)
      created_at = COALESCE(created_at, NOW())
    WHERE user_id = v_existing_user_id;
  ELSE
    -- New user - insert with auth.users.id as FK
    INSERT INTO public.users (
      user_id,  -- FK from auth.users.id
      user_email,
      is_email_verified,
      created_at,
      last_login_at,
      current_payment_plan
    )
    VALUES (
      NEW.id,  -- FK from auth.users.id
      v_user_email,
      NEW.email_confirmed_at IS NOT NULL,
      COALESCE(NEW.created_at, NOW()),
      COALESCE(NEW.last_sign_in_at, NOW()),
      'free'  -- Default payment plan
    )
    ON CONFLICT (user_id) DO UPDATE
    SET 
      user_email = EXCLUDED.user_email,
      is_email_verified = EXCLUDED.is_email_verified,
      last_login_at = COALESCE(EXCLUDED.last_login_at, NOW());
  END IF;
  
  RETURN NEW;
END;
$$;

-- 7. switch_campaign
CREATE OR REPLACE FUNCTION public.switch_campaign(p_project_id uuid, p_target_campaign_id uuid) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_current_active_id UUID;
  v_target_status public.campaign_status_enum;
  v_target_project_id UUID;
  v_is_publishable BOOLEAN;
BEGIN
  -- Find current ACTIVE campaign
  SELECT campaign_id INTO v_current_active_id
  FROM public.campaigns
  WHERE project_id = p_project_id AND campaign_status = 'ACTIVE'::public.campaign_status_enum
  LIMIT 1;

  IF v_current_active_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No ACTIVE campaign found. Use publish_campaign instead.');
  END IF;

  -- Verify target campaign
  SELECT project_id, campaign_status INTO v_target_project_id, v_target_status
  FROM public.campaigns
  WHERE campaign_id = p_target_campaign_id;

  IF v_target_project_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target campaign not found');
  END IF;

  IF v_target_project_id != p_project_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target campaign does not belong to project');
  END IF;

  IF v_target_status NOT IN ('DRAFT'::public.campaign_status_enum, 'PAUSED'::public.campaign_status_enum) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target campaign must be DRAFT or PAUSED');
  END IF;

  -- Check if target is publishable
  SELECT public.is_campaign_publishable(p_target_campaign_id) INTO v_is_publishable;
  
  IF NOT v_is_publishable THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target campaign is not publishable');
  END IF;

  -- Atomic switch: pause current, activate target
  UPDATE public.campaigns SET campaign_status = 'PAUSED'::public.campaign_status_enum WHERE campaign_id = v_current_active_id;
  UPDATE public.campaigns SET campaign_status = 'ACTIVE'::public.campaign_status_enum WHERE campaign_id = p_target_campaign_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
