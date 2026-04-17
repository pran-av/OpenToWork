-- Migrate legacy campaign service/case data to experience tables
-- and deprecate legacy campaign service/case write flow.

ALTER TABLE internal.experience_case_studies
  ADD COLUMN IF NOT EXISTS legacy_source_case_id UUID NULL;

ALTER TABLE internal.experience_case_studies
  ADD COLUMN IF NOT EXISTS legacy_source_service_id UUID NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_internal_experience_legacy_case_unique
  ON internal.experience_case_studies (legacy_source_case_id)
  WHERE legacy_source_case_id IS NOT NULL;

INSERT INTO internal.service_classes (user_id, service_class_name, is_system_default, preset)
SELECT DISTINCT
  p.user_id,
  upper(btrim(cs.client_service_name)),
  false,
  NULL
FROM public.client_services cs
JOIN public.campaigns c ON c.campaign_id = cs.campaign_id
JOIN public.projects p ON p.project_id = c.project_id
LEFT JOIN internal.service_classes sc
  ON sc.user_id = p.user_id
 AND lower(sc.service_class_name) = lower(btrim(cs.client_service_name))
WHERE btrim(cs.client_service_name) <> ''
  AND sc.service_class_id IS NULL;

INSERT INTO internal.experience_case_studies (
  service_class_id,
  case_name,
  case_summary,
  case_duration,
  display_year,
  case_highlights,
  case_study_url,
  is_archived,
  archived_at,
  ai_opt_in,
  vector_status,
  vector_updated_at,
  created_at,
  updated_at,
  legacy_source_case_id,
  legacy_source_service_id
)
SELECT
  sc.service_class_id,
  legacy_cs.case_name,
  CASE
    WHEN legacy_cs.case_summary IS NULL OR btrim(legacy_cs.case_summary) = '' THEN NULL
    ELSE left(btrim(legacy_cs.case_summary), 700)
  END,
  NULLIF(btrim(COALESCE(legacy_cs.case_duration, '')), ''),
  GREATEST(1900, LEAST(2099, EXTRACT(YEAR FROM COALESCE(legacy_cs.created_at, NOW()))::INTEGER)),
  legacy_cs.case_highlights,
  NULLIF(btrim(COALESCE(legacy_cs.case_study_url, '')), ''),
  false,
  NULL,
  false,
  'pending',
  NULL,
  COALESCE(legacy_cs.created_at, NOW()),
  COALESCE(legacy_cs.created_at, NOW()),
  legacy_cs.case_id,
  legacy_cs.client_service_id
FROM public.case_studies legacy_cs
JOIN public.client_services legacy_service
  ON legacy_service.client_service_id = legacy_cs.client_service_id
JOIN public.campaigns c ON c.campaign_id = legacy_service.campaign_id
JOIN public.projects p ON p.project_id = c.project_id
JOIN internal.service_classes sc
  ON sc.user_id = p.user_id
 AND lower(sc.service_class_name) = lower(btrim(legacy_service.client_service_name))
LEFT JOIN internal.experience_case_studies existing_case
  ON existing_case.legacy_source_case_id = legacy_cs.case_id
WHERE existing_case.case_id IS NULL;

INSERT INTO internal.campaign_case_studies (
  campaign_id,
  case_id,
  attached_service_class_id,
  order_index,
  attached_at
)
SELECT
  legacy_service.campaign_id,
  migrated_case.case_id,
  sc.service_class_id,
  ranked.order_index,
  COALESCE(legacy_cs.created_at, NOW())
FROM (
  SELECT
    cs.case_id,
    cs.client_service_id,
    ROW_NUMBER() OVER (
      PARTITION BY legacy_service.campaign_id
      ORDER BY COALESCE(cs.created_at, NOW()) ASC, cs.case_id ASC
    ) - 1 AS order_index
  FROM public.case_studies cs
  JOIN public.client_services legacy_service
    ON legacy_service.client_service_id = cs.client_service_id
) ranked
JOIN public.case_studies legacy_cs ON legacy_cs.case_id = ranked.case_id
JOIN public.client_services legacy_service
  ON legacy_service.client_service_id = ranked.client_service_id
JOIN public.campaigns c ON c.campaign_id = legacy_service.campaign_id
JOIN public.projects p ON p.project_id = c.project_id
JOIN internal.experience_case_studies migrated_case
  ON migrated_case.legacy_source_case_id = legacy_cs.case_id
JOIN internal.service_classes sc
  ON sc.user_id = p.user_id
 AND lower(sc.service_class_name) = lower(btrim(legacy_service.client_service_name))
LEFT JOIN internal.campaign_case_studies existing_attachment
  ON existing_attachment.campaign_id = legacy_service.campaign_id
 AND existing_attachment.case_id = migrated_case.case_id
WHERE existing_attachment.campaign_case_study_id IS NULL;

CREATE OR REPLACE FUNCTION public.detach_experience_case_study_from_campaign(
  p_campaign_id UUID,
  p_case_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $detach_experience_case_study_from_campaign$
DECLARE
  v_uid UUID;
BEGIN
  SELECT uid INTO v_uid FROM (SELECT auth.uid() AS uid) me;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF p_campaign_id IS NULL OR p_case_id IS NULL THEN
    RAISE EXCEPTION 'Campaign ID and case ID are required';
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
    RAISE EXCEPTION 'Campaign not found, not draft, or not owned by user';
  END IF;

  DELETE FROM internal.campaign_case_studies ccs
  WHERE ccs.campaign_id = p_campaign_id
    AND ccs.case_id = p_case_id;
END;
$detach_experience_case_study_from_campaign$;

REVOKE EXECUTE ON FUNCTION public.detach_experience_case_study_from_campaign(UUID, UUID) FROM public;
REVOKE EXECUTE ON FUNCTION public.detach_experience_case_study_from_campaign(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.detach_experience_case_study_from_campaign(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.detach_experience_case_study_from_campaign(UUID, UUID) TO service_role;

COMMENT ON FUNCTION public.detach_experience_case_study_from_campaign(UUID, UUID) IS
  'Detaches a previously attached experience case study from a draft campaign owned by the authenticated user.';

CREATE OR REPLACE FUNCTION public.is_campaign_publishable(p_campaign_id uuid) RETURNS boolean
LANGUAGE plpgsql
SET search_path = ''
AS $is_campaign_publishable$
DECLARE
  v_has_client_name BOOLEAN;
  v_has_client_summary BOOLEAN;
  v_has_cta BOOLEAN;
  v_has_attached_experience BOOLEAN;
BEGIN
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

COMMENT ON FUNCTION public.is_campaign_publishable(UUID) IS
  'A campaign is publishable when mandatory content fields are set and at least one experience case study is attached.';

REVOKE INSERT, UPDATE, DELETE ON TABLE public.client_services FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.client_services FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.case_studies FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.case_studies FROM authenticated;

COMMENT ON TABLE public.client_services IS
  'DEPRECATED for campaign editing writes. Campaigns now attach reusable experience case studies via internal.campaign_case_studies.';
COMMENT ON TABLE public.case_studies IS
  'DEPRECATED for campaign editing writes. Replaced by internal.experience_case_studies and internal.campaign_case_studies.';
