-- Hardening:
-- 1) Any ACTIVE + non-archived campaign attachments are visible to everyone (anon + authenticated).
-- 2) Inactive or archived campaign attachments are visible only to the owning authenticated user.
-- 3) No seed/test data logic is included in migrations.

CREATE OR REPLACE FUNCTION public.get_attached_experience_case_studies_for_campaign(
  p_campaign_id UUID
) RETURNS TABLE (
  case_id UUID,
  attached_service_class_id UUID,
  service_class_name TEXT,
  case_name VARCHAR(75),
  case_summary VARCHAR(700),
  case_duration VARCHAR(255),
  display_year INTEGER,
  case_highlights TEXT,
  case_study_url VARCHAR(500),
  created_at TIMESTAMPTZ,
  order_index INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $get_attached_experience_case_studies_for_campaign$
DECLARE
  v_user_id UUID;
  v_campaign_owner UUID;
  v_campaign_status public.campaign_status_enum;
  v_project_archived BOOLEAN;
BEGIN
  IF p_campaign_id IS NULL THEN
    RETURN;
  END IF;

  SELECT uid INTO v_user_id FROM (SELECT auth.uid() AS uid) me;

  SELECT p.user_id, c.campaign_status, p.is_archived
  INTO v_campaign_owner, v_campaign_status, v_project_archived
  FROM public.campaigns c
  JOIN public.projects p ON p.project_id = c.project_id
  WHERE c.campaign_id = p_campaign_id;

  IF v_campaign_owner IS NULL THEN
    RETURN;
  END IF;

  -- Access model:
  -- - active + non-archived campaign attachments are public
  -- - otherwise, ownership is required
  IF NOT (
    (v_campaign_status = 'ACTIVE'::public.campaign_status_enum AND v_project_archived = false)
    OR (v_user_id IS NOT NULL AND v_campaign_owner = v_user_id)
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    ecs.case_id,
    ccs.attached_service_class_id,
    upper(sc.service_class_name)::TEXT AS service_class_name,
    ecs.case_name,
    ecs.case_summary,
    ecs.case_duration,
    ecs.display_year,
    ecs.case_highlights,
    ecs.case_study_url,
    ecs.created_at,
    ccs.order_index
  FROM internal.campaign_case_studies ccs
  JOIN internal.experience_case_studies ecs ON ecs.case_id = ccs.case_id
  JOIN internal.service_classes sc ON sc.service_class_id = COALESCE(ccs.attached_service_class_id, ecs.service_class_id)
  WHERE ccs.campaign_id = p_campaign_id
    AND ecs.is_archived = false
  ORDER BY ccs.order_index ASC, ecs.created_at DESC;
END;
$get_attached_experience_case_studies_for_campaign$;

REVOKE EXECUTE ON FUNCTION public.get_attached_experience_case_studies_for_campaign(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.get_attached_experience_case_studies_for_campaign(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_attached_experience_case_studies_for_campaign(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_attached_experience_case_studies_for_campaign(UUID) TO service_role;

COMMENT ON FUNCTION public.get_attached_experience_case_studies_for_campaign(UUID) IS
  'Returns attachments for any active non-archived campaign to all users, otherwise only for the owning authenticated user.';
