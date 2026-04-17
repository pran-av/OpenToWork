-- Fix ambiguous column resolution in attach_experience_case_study_to_campaign.
-- Root cause: RETURNS TABLE output names overlap with conflict target column names.
-- Fix: use ON CONFLICT ON CONSTRAINT instead of column-list conflict target.

CREATE OR REPLACE FUNCTION public.attach_experience_case_study_to_campaign(
  p_campaign_id UUID,
  p_case_id UUID,
  p_attached_service_class_id UUID DEFAULT NULL,
  p_order_index INTEGER DEFAULT 0
)
RETURNS TABLE (
  campaign_case_study_id UUID,
  campaign_id UUID,
  case_id UUID,
  attached_service_class_id UUID,
  order_index INTEGER,
  attached_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $attach_experience_case_study_to_campaign$
DECLARE
  v_uid UUID;
BEGIN
  SELECT uid INTO v_uid FROM (SELECT auth.uid() AS uid) me;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_campaign_id IS NULL OR p_case_id IS NULL THEN
    RAISE EXCEPTION 'Campaign ID and Case ID are required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.campaigns c
    JOIN public.projects p ON p.project_id = c.project_id
    WHERE c.campaign_id = p_campaign_id
      AND p.user_id = v_uid
      AND c.campaign_status = 'DRAFT'::public.campaign_status_enum
      AND p.is_archived = false
  ) THEN
    RAISE EXCEPTION 'Campaign not available for attachment';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM internal.experience_case_studies ecs
    JOIN internal.service_classes sc ON sc.service_class_id = ecs.service_class_id
    WHERE ecs.case_id = p_case_id
      AND sc.user_id = v_uid
      AND ecs.is_archived = false
      AND sc.is_archived = false
  ) THEN
    RAISE EXCEPTION 'Case study not available';
  END IF;

  RETURN QUERY
  INSERT INTO internal.campaign_case_studies (
    campaign_id,
    case_id,
    attached_service_class_id,
    order_index
  )
  VALUES (
    p_campaign_id,
    p_case_id,
    p_attached_service_class_id,
    COALESCE(p_order_index, 0)
  )
  ON CONFLICT ON CONSTRAINT campaign_case_study_unique DO UPDATE
    SET attached_service_class_id = EXCLUDED.attached_service_class_id,
        order_index = EXCLUDED.order_index
  RETURNING
    internal.campaign_case_studies.campaign_case_study_id,
    internal.campaign_case_studies.campaign_id,
    internal.campaign_case_studies.case_id,
    internal.campaign_case_studies.attached_service_class_id,
    internal.campaign_case_studies.order_index,
    internal.campaign_case_studies.attached_at;
END;
$attach_experience_case_study_to_campaign$;

REVOKE EXECUTE ON FUNCTION public.attach_experience_case_study_to_campaign(UUID, UUID, UUID, INTEGER) FROM public;
REVOKE EXECUTE ON FUNCTION public.attach_experience_case_study_to_campaign(UUID, UUID, UUID, INTEGER) FROM anon;
GRANT EXECUTE ON FUNCTION public.attach_experience_case_study_to_campaign(UUID, UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.attach_experience_case_study_to_campaign(UUID, UUID, UUID, INTEGER) TO service_role;
