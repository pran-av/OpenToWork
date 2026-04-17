-- Fix publishability permission model after experience migration.
-- Ensures campaign owners can evaluate publishability without direct access
-- to internal.campaign_case_studies, while preserving ownership constraints.

CREATE OR REPLACE FUNCTION public.is_campaign_publishable(p_campaign_id uuid) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $is_campaign_publishable$
DECLARE
  v_uid UUID;
  v_campaign_owner UUID;
  v_has_client_name BOOLEAN;
  v_has_client_summary BOOLEAN;
  v_has_cta BOOLEAN;
  v_has_attached_experience BOOLEAN;
BEGIN
  SELECT uid INTO v_uid FROM (SELECT auth.uid() AS uid) me;
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT p.user_id
  INTO v_campaign_owner
  FROM public.campaigns c
  JOIN public.projects p ON p.project_id = c.project_id
  WHERE c.campaign_id = p_campaign_id;

  IF v_campaign_owner IS NULL OR v_campaign_owner <> v_uid THEN
    RETURN FALSE;
  END IF;

  SELECT
    (campaign_structure->>'client_name') IS NOT NULL
    AND btrim(campaign_structure->>'client_name') <> '',
    (campaign_structure->>'client_summary') IS NOT NULL
    AND btrim(campaign_structure->>'client_summary') <> ''
  INTO v_has_client_name, v_has_client_summary
  FROM public.campaigns
  WHERE campaign_id = p_campaign_id;

  IF NOT v_has_client_name OR NOT v_has_client_summary THEN
    RETURN FALSE;
  END IF;

  SELECT
    COALESCE(NULLIF(btrim(cta_config->>'schedule_meeting'), ''), NULL) IS NOT NULL
    OR COALESCE(NULLIF(btrim(cta_config->>'mailto'), ''), NULL) IS NOT NULL
    OR COALESCE(NULLIF(btrim(cta_config->>'linkedin'), ''), NULL) IS NOT NULL
    OR COALESCE(NULLIF(btrim(cta_config->>'phone'), ''), NULL) IS NOT NULL
  INTO v_has_cta
  FROM public.campaigns
  WHERE campaign_id = p_campaign_id;

  IF NOT v_has_cta THEN
    RETURN FALSE;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM internal.campaign_case_studies ccs
    WHERE ccs.campaign_id = p_campaign_id
  )
  INTO v_has_attached_experience;

  RETURN v_has_attached_experience;
END;
$is_campaign_publishable$;

REVOKE EXECUTE ON FUNCTION public.is_campaign_publishable(UUID) FROM public;
REVOKE EXECUTE ON FUNCTION public.is_campaign_publishable(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_campaign_publishable(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_campaign_publishable(UUID) TO service_role;

COMMENT ON FUNCTION public.is_campaign_publishable(UUID) IS
  'Returns true only for the authenticated campaign owner when mandatory campaign fields are present and at least one experience case study is attached.';
