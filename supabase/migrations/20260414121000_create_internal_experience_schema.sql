-- Create internal schema objects for reusable service classes and experience case studies.
-- This migration follows the schema rules:
-- - Internal tables are not directly exposed to anon/authenticated.
-- - App access is via public RPC functions with explicit grants and revokes.
-- - Display year is explicitly collected/stored; no duration parsing is used.

CREATE SCHEMA IF NOT EXISTS internal;
GRANT USAGE ON SCHEMA internal TO service_role;

CREATE TABLE IF NOT EXISTS internal.service_classes (
  service_class_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  service_class_name VARCHAR(80) NOT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT service_class_name_not_blank CHECK (btrim(service_class_name) <> '')
);

CREATE TABLE IF NOT EXISTS internal.experience_case_studies (
  case_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_class_id UUID NOT NULL REFERENCES internal.service_classes(service_class_id) ON DELETE CASCADE,
  case_name VARCHAR(75) NOT NULL,
  case_summary VARCHAR(700),
  case_duration VARCHAR(255) NOT NULL,
  display_year INTEGER NOT NULL,
  case_highlights TEXT NOT NULL,
  case_study_url VARCHAR(500),
  is_archived BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMPTZ,
  ai_opt_in BOOLEAN NOT NULL DEFAULT false,
  vector_status TEXT NOT NULL DEFAULT 'pending',
  vector_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT experience_case_name_not_blank CHECK (btrim(case_name) <> ''),
  CONSTRAINT experience_case_duration_not_blank CHECK (btrim(case_duration) <> ''),
  CONSTRAINT experience_case_highlights_not_blank CHECK (btrim(case_highlights) <> ''),
  CONSTRAINT experience_case_display_year_range CHECK (display_year >= 1900 AND display_year <= 2099)
);

CREATE TABLE IF NOT EXISTS internal.campaign_case_studies (
  campaign_case_study_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(campaign_id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES internal.experience_case_studies(case_id) ON DELETE CASCADE,
  attached_service_class_id UUID REFERENCES internal.service_classes(service_class_id) ON DELETE SET NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  attached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT campaign_case_study_unique UNIQUE (campaign_id, case_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_internal_service_classes_user_name_unique
  ON internal.service_classes (user_id, lower(service_class_name));
CREATE INDEX IF NOT EXISTS idx_internal_service_classes_user_created
  ON internal.service_classes (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_internal_experience_service_class
  ON internal.experience_case_studies (service_class_id);
CREATE INDEX IF NOT EXISTS idx_internal_experience_display_year
  ON internal.experience_case_studies (display_year DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_internal_experience_name
  ON internal.experience_case_studies (lower(case_name));
CREATE INDEX IF NOT EXISTS idx_internal_campaign_case_studies_campaign
  ON internal.campaign_case_studies (campaign_id, order_index, attached_at DESC);

CREATE OR REPLACE FUNCTION internal.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $touch_updated_at$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$touch_updated_at$;

REVOKE EXECUTE ON FUNCTION internal.touch_updated_at() FROM public;
REVOKE EXECUTE ON FUNCTION internal.touch_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION internal.touch_updated_at() FROM authenticated;
GRANT EXECUTE ON FUNCTION internal.touch_updated_at() TO service_role;

CREATE OR REPLACE FUNCTION internal.ensure_campaign_case_study_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $ensure_campaign_case_study_ownership$
DECLARE
  v_case_owner UUID;
  v_campaign_owner UUID;
  v_service_class_id UUID;
BEGIN
  SELECT sc.user_id, ecs.service_class_id
  INTO v_case_owner, v_service_class_id
  FROM internal.experience_case_studies ecs
  JOIN internal.service_classes sc ON sc.service_class_id = ecs.service_class_id
  WHERE ecs.case_id = NEW.case_id;

  SELECT p.user_id
  INTO v_campaign_owner
  FROM public.campaigns c
  JOIN public.projects p ON p.project_id = c.project_id
  WHERE c.campaign_id = NEW.campaign_id;

  IF v_case_owner IS NULL OR v_campaign_owner IS NULL OR v_case_owner <> v_campaign_owner THEN
    RAISE EXCEPTION 'Case study and campaign ownership mismatch';
  END IF;

  IF NEW.attached_service_class_id IS NULL THEN
    NEW.attached_service_class_id = v_service_class_id;
  END IF;

  RETURN NEW;
END;
$ensure_campaign_case_study_ownership$;

REVOKE EXECUTE ON FUNCTION internal.ensure_campaign_case_study_ownership() FROM public;
REVOKE EXECUTE ON FUNCTION internal.ensure_campaign_case_study_ownership() FROM anon;
REVOKE EXECUTE ON FUNCTION internal.ensure_campaign_case_study_ownership() FROM authenticated;
GRANT EXECUTE ON FUNCTION internal.ensure_campaign_case_study_ownership() TO service_role;

DROP TRIGGER IF EXISTS trigger_service_classes_touch_updated_at ON internal.service_classes;
CREATE TRIGGER trigger_service_classes_touch_updated_at
  BEFORE UPDATE ON internal.service_classes
  FOR EACH ROW
  EXECUTE FUNCTION internal.touch_updated_at();

DROP TRIGGER IF EXISTS trigger_experience_case_studies_touch_updated_at ON internal.experience_case_studies;
CREATE TRIGGER trigger_experience_case_studies_touch_updated_at
  BEFORE UPDATE ON internal.experience_case_studies
  FOR EACH ROW
  EXECUTE FUNCTION internal.touch_updated_at();

DROP TRIGGER IF EXISTS trigger_campaign_case_studies_ownership ON internal.campaign_case_studies;
CREATE TRIGGER trigger_campaign_case_studies_ownership
  BEFORE INSERT OR UPDATE ON internal.campaign_case_studies
  FOR EACH ROW
  EXECUTE FUNCTION internal.ensure_campaign_case_study_ownership();

ALTER TABLE internal.service_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal.experience_case_studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal.campaign_case_studies ENABLE ROW LEVEL SECURITY;

-- Service role can read/write internal data for background processing.
CREATE POLICY service_role_service_classes_all
  ON internal.service_classes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY service_role_experience_case_studies_all
  ON internal.experience_case_studies
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY service_role_campaign_case_studies_all
  ON internal.campaign_case_studies
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON internal.service_classes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON internal.experience_case_studies TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON internal.campaign_case_studies TO service_role;

CREATE OR REPLACE FUNCTION public.get_experience_service_classes()
RETURNS TABLE (
  service_class_id UUID,
  user_id UUID,
  service_class_name VARCHAR(80),
  is_archived BOOLEAN,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $get_experience_service_classes$
DECLARE
  v_uid UUID;
BEGIN
  SELECT uid INTO v_uid FROM (SELECT auth.uid() AS uid) me;
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    sc.service_class_id,
    sc.user_id,
    sc.service_class_name,
    sc.is_archived,
    sc.archived_at,
    sc.created_at,
    sc.updated_at
  FROM internal.service_classes sc
  WHERE sc.user_id = v_uid
    AND sc.is_archived = false
  ORDER BY sc.service_class_name ASC;
END;
$get_experience_service_classes$;

CREATE OR REPLACE FUNCTION public.create_experience_service_class(
  p_service_class_name TEXT
)
RETURNS TABLE (
  service_class_id UUID,
  user_id UUID,
  service_class_name VARCHAR(80),
  is_archived BOOLEAN,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $create_experience_service_class$
DECLARE
  v_uid UUID;
BEGIN
  SELECT uid INTO v_uid FROM (SELECT auth.uid() AS uid) me;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF p_service_class_name IS NULL OR btrim(p_service_class_name) = '' THEN
    RAISE EXCEPTION 'Service class name is required';
  END IF;

  RETURN QUERY
  INSERT INTO internal.service_classes (user_id, service_class_name)
  VALUES (v_uid, btrim(p_service_class_name))
  RETURNING
    internal.service_classes.service_class_id,
    internal.service_classes.user_id,
    internal.service_classes.service_class_name,
    internal.service_classes.is_archived,
    internal.service_classes.archived_at,
    internal.service_classes.created_at,
    internal.service_classes.updated_at;
END;
$create_experience_service_class$;

CREATE OR REPLACE FUNCTION public.get_experience_case_studies()
RETURNS TABLE (
  case_id UUID,
  service_class_id UUID,
  service_class_name VARCHAR(80),
  case_name VARCHAR(75),
  case_summary VARCHAR(150),
  case_duration VARCHAR(255),
  display_year INTEGER,
  case_highlights TEXT,
  case_study_url VARCHAR(500),
  is_archived BOOLEAN,
  archived_at TIMESTAMPTZ,
  ai_opt_in BOOLEAN,
  vector_status TEXT,
  vector_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $get_experience_case_studies$
DECLARE
  v_uid UUID;
BEGIN
  SELECT uid INTO v_uid FROM (SELECT auth.uid() AS uid) me;
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    ecs.case_id,
    ecs.service_class_id,
    sc.service_class_name,
    ecs.case_name,
    ecs.case_summary,
    ecs.case_duration,
    ecs.display_year,
    ecs.case_highlights,
    ecs.case_study_url,
    ecs.is_archived,
    ecs.archived_at,
    ecs.ai_opt_in,
    ecs.vector_status,
    ecs.vector_updated_at,
    ecs.created_at,
    ecs.updated_at
  FROM internal.experience_case_studies ecs
  JOIN internal.service_classes sc ON sc.service_class_id = ecs.service_class_id
  WHERE sc.user_id = v_uid
    AND ecs.is_archived = false
    AND sc.is_archived = false
  ORDER BY ecs.display_year DESC, ecs.created_at DESC;
END;
$get_experience_case_studies$;

CREATE OR REPLACE FUNCTION public.create_experience_case_study(
  p_service_class_id UUID,
  p_case_name TEXT,
  p_case_summary TEXT DEFAULT NULL,
  p_case_duration TEXT DEFAULT NULL,
  p_display_year INTEGER DEFAULT NULL,
  p_case_highlights TEXT DEFAULT NULL,
  p_case_study_url TEXT DEFAULT NULL
)
RETURNS TABLE (
  case_id UUID,
  service_class_id UUID,
  case_name VARCHAR(75),
  case_summary VARCHAR(150),
  case_duration VARCHAR(255),
  display_year INTEGER,
  case_highlights TEXT,
  case_study_url VARCHAR(500),
  is_archived BOOLEAN,
  archived_at TIMESTAMPTZ,
  ai_opt_in BOOLEAN,
  vector_status TEXT,
  vector_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $create_experience_case_study$
DECLARE
  v_uid UUID;
BEGIN
  SELECT uid INTO v_uid FROM (SELECT auth.uid() AS uid) me;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF p_service_class_id IS NULL THEN
    RAISE EXCEPTION 'Service class is required';
  END IF;
  IF p_case_name IS NULL OR btrim(p_case_name) = '' THEN
    RAISE EXCEPTION 'Case name is required';
  END IF;
  IF p_case_duration IS NULL OR btrim(p_case_duration) = '' THEN
    RAISE EXCEPTION 'Case duration is required';
  END IF;
  IF p_display_year IS NULL THEN
    RAISE EXCEPTION 'Display year is required';
  END IF;
  IF p_case_highlights IS NULL OR btrim(p_case_highlights) = '' THEN
    RAISE EXCEPTION 'Case highlights are required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM internal.service_classes sc
    WHERE sc.service_class_id = p_service_class_id
      AND sc.user_id = v_uid
      AND sc.is_archived = false
  ) THEN
    RAISE EXCEPTION 'Service class not found';
  END IF;

  RETURN QUERY
  INSERT INTO internal.experience_case_studies (
    service_class_id,
    case_name,
    case_summary,
    case_duration,
    display_year,
    case_highlights,
    case_study_url
  )
  VALUES (
    p_service_class_id,
    btrim(p_case_name),
    NULLIF(btrim(COALESCE(p_case_summary, '')), ''),
    btrim(p_case_duration),
    p_display_year,
    btrim(p_case_highlights),
    NULLIF(btrim(COALESCE(p_case_study_url, '')), '')
  )
  RETURNING
    internal.experience_case_studies.case_id,
    internal.experience_case_studies.service_class_id,
    internal.experience_case_studies.case_name,
    internal.experience_case_studies.case_summary,
    internal.experience_case_studies.case_duration,
    internal.experience_case_studies.display_year,
    internal.experience_case_studies.case_highlights,
    internal.experience_case_studies.case_study_url,
    internal.experience_case_studies.is_archived,
    internal.experience_case_studies.archived_at,
    internal.experience_case_studies.ai_opt_in,
    internal.experience_case_studies.vector_status,
    internal.experience_case_studies.vector_updated_at,
    internal.experience_case_studies.created_at,
    internal.experience_case_studies.updated_at;
END;
$create_experience_case_study$;

CREATE OR REPLACE FUNCTION public.update_experience_case_study(
  p_case_id UUID,
  p_case_name TEXT DEFAULT NULL,
  p_case_summary TEXT DEFAULT NULL,
  p_case_duration TEXT DEFAULT NULL,
  p_display_year INTEGER DEFAULT NULL,
  p_case_highlights TEXT DEFAULT NULL,
  p_case_study_url TEXT DEFAULT NULL,
  p_is_archived BOOLEAN DEFAULT NULL
)
RETURNS TABLE (
  case_id UUID,
  service_class_id UUID,
  case_name VARCHAR(75),
  case_summary VARCHAR(150),
  case_duration VARCHAR(255),
  display_year INTEGER,
  case_highlights TEXT,
  case_study_url VARCHAR(500),
  is_archived BOOLEAN,
  archived_at TIMESTAMPTZ,
  ai_opt_in BOOLEAN,
  vector_status TEXT,
  vector_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $update_experience_case_study$
DECLARE
  v_uid UUID;
BEGIN
  SELECT uid INTO v_uid FROM (SELECT auth.uid() AS uid) me;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF p_case_id IS NULL THEN
    RAISE EXCEPTION 'Case ID is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM internal.experience_case_studies ecs
    JOIN internal.service_classes sc ON sc.service_class_id = ecs.service_class_id
    WHERE ecs.case_id = p_case_id
      AND sc.user_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Case study not found';
  END IF;

  IF p_case_duration IS NOT NULL AND btrim(p_case_duration) = '' THEN
    RAISE EXCEPTION 'Case duration is required';
  END IF;

  RETURN QUERY
  UPDATE internal.experience_case_studies ecs
  SET
    case_name = COALESCE(NULLIF(btrim(COALESCE(p_case_name, '')), ''), ecs.case_name),
    case_summary = CASE
      WHEN p_case_summary IS NULL THEN ecs.case_summary
      ELSE NULLIF(btrim(p_case_summary), '')
    END,
    case_duration = COALESCE(NULLIF(btrim(COALESCE(p_case_duration, '')), ''), ecs.case_duration),
    display_year = COALESCE(p_display_year, ecs.display_year),
    case_highlights = COALESCE(NULLIF(btrim(COALESCE(p_case_highlights, '')), ''), ecs.case_highlights),
    case_study_url = CASE
      WHEN p_case_study_url IS NULL THEN ecs.case_study_url
      ELSE NULLIF(btrim(p_case_study_url), '')
    END,
    is_archived = COALESCE(p_is_archived, ecs.is_archived),
    archived_at = CASE
      WHEN p_is_archived IS NULL THEN ecs.archived_at
      WHEN p_is_archived THEN NOW()
      ELSE NULL
    END
  WHERE ecs.case_id = p_case_id
  RETURNING
    ecs.case_id,
    ecs.service_class_id,
    ecs.case_name,
    ecs.case_summary,
    ecs.case_duration,
    ecs.display_year,
    ecs.case_highlights,
    ecs.case_study_url,
    ecs.is_archived,
    ecs.archived_at,
    ecs.ai_opt_in,
    ecs.vector_status,
    ecs.vector_updated_at,
    ecs.created_at,
    ecs.updated_at;
END;
$update_experience_case_study$;

CREATE OR REPLACE FUNCTION public.search_experience_case_studies(
  p_query TEXT DEFAULT '',
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  case_id UUID,
  service_class_id UUID,
  service_class_name VARCHAR(80),
  case_name VARCHAR(75),
  case_summary VARCHAR(150),
  case_duration VARCHAR(255),
  display_year INTEGER,
  case_highlights TEXT,
  case_study_url VARCHAR(500),
  is_archived BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $search_experience_case_studies$
DECLARE
  v_uid UUID;
  v_limit INTEGER;
BEGIN
  SELECT uid INTO v_uid FROM (SELECT auth.uid() AS uid) me;
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  v_limit := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);

  RETURN QUERY
  SELECT
    ecs.case_id,
    ecs.service_class_id,
    sc.service_class_name,
    ecs.case_name,
    ecs.case_summary,
    ecs.case_duration,
    ecs.display_year,
    ecs.case_highlights,
    ecs.case_study_url,
    ecs.is_archived,
    ecs.created_at
  FROM internal.experience_case_studies ecs
  JOIN internal.service_classes sc ON sc.service_class_id = ecs.service_class_id
  WHERE sc.user_id = v_uid
    AND ecs.is_archived = false
    AND sc.is_archived = false
    AND (
      p_query IS NULL
      OR btrim(p_query) = ''
      OR lower(ecs.case_name) LIKE '%' || lower(btrim(p_query)) || '%'
    )
  ORDER BY ecs.created_at DESC
  LIMIT v_limit;
END;
$search_experience_case_studies$;

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
      AND c.campaign_status = 'DRAFT'
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
  ON CONFLICT (campaign_id, case_id) DO UPDATE
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

CREATE OR REPLACE FUNCTION public.get_attached_experience_case_studies_for_campaign(
  p_campaign_id UUID
) RETURNS TABLE (
  case_id UUID,
  attached_service_class_id UUID,
  service_class_name TEXT,
  case_name VARCHAR(75),
  case_summary VARCHAR(150),
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

  IF NOT (
    (v_user_id IS NOT NULL AND v_campaign_owner = v_user_id)
    OR (v_campaign_status = 'ACTIVE' AND v_project_archived = false)
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    ecs.case_id,
    ccs.attached_service_class_id,
    sc.service_class_name::TEXT,
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

REVOKE EXECUTE ON FUNCTION public.get_experience_service_classes() FROM public;
REVOKE EXECUTE ON FUNCTION public.get_experience_service_classes() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_experience_service_classes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_experience_service_classes() TO service_role;

REVOKE EXECUTE ON FUNCTION public.create_experience_service_class(TEXT) FROM public;
REVOKE EXECUTE ON FUNCTION public.create_experience_service_class(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_experience_service_class(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_experience_service_class(TEXT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_experience_case_studies() FROM public;
REVOKE EXECUTE ON FUNCTION public.get_experience_case_studies() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_experience_case_studies() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_experience_case_studies() TO service_role;

REVOKE EXECUTE ON FUNCTION public.create_experience_case_study(UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT) FROM public;
REVOKE EXECUTE ON FUNCTION public.create_experience_case_study(UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_experience_case_study(UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_experience_case_study(UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.update_experience_case_study(UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, BOOLEAN) FROM public;
REVOKE EXECUTE ON FUNCTION public.update_experience_case_study(UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, BOOLEAN) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_experience_case_study(UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_experience_case_study(UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, BOOLEAN) TO service_role;

REVOKE EXECUTE ON FUNCTION public.search_experience_case_studies(TEXT, INTEGER) FROM public;
REVOKE EXECUTE ON FUNCTION public.search_experience_case_studies(TEXT, INTEGER) FROM anon;
GRANT EXECUTE ON FUNCTION public.search_experience_case_studies(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_experience_case_studies(TEXT, INTEGER) TO service_role;

REVOKE EXECUTE ON FUNCTION public.attach_experience_case_study_to_campaign(UUID, UUID, UUID, INTEGER) FROM public;
REVOKE EXECUTE ON FUNCTION public.attach_experience_case_study_to_campaign(UUID, UUID, UUID, INTEGER) FROM anon;
GRANT EXECUTE ON FUNCTION public.attach_experience_case_study_to_campaign(UUID, UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.attach_experience_case_study_to_campaign(UUID, UUID, UUID, INTEGER) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_attached_experience_case_studies_for_campaign(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.get_attached_experience_case_studies_for_campaign(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_attached_experience_case_studies_for_campaign(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_attached_experience_case_studies_for_campaign(UUID) TO service_role;

COMMENT ON FUNCTION public.get_experience_service_classes() IS
  'Returns non-archived service classes for the authenticated user from internal schema.';
COMMENT ON FUNCTION public.create_experience_service_class(TEXT) IS
  'Creates a service class in internal schema for the authenticated user.';
COMMENT ON FUNCTION public.get_experience_case_studies() IS
  'Returns non-archived case studies with service class labels for the authenticated user.';
COMMENT ON FUNCTION public.create_experience_case_study(UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT) IS
  'Creates an experience case study in internal schema with explicit display_year.';
COMMENT ON FUNCTION public.update_experience_case_study(UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, BOOLEAN) IS
  'Updates or archives/unarchives a user-owned experience case study.';
COMMENT ON FUNCTION public.search_experience_case_studies(TEXT, INTEGER) IS
  'Searches user-owned non-archived experience case studies by case name.';
COMMENT ON FUNCTION public.attach_experience_case_study_to_campaign(UUID, UUID, UUID, INTEGER) IS
  'Attaches a user-owned case study to a draft campaign by reference.';
COMMENT ON FUNCTION public.get_attached_experience_case_studies_for_campaign(UUID) IS
  'Returns attached non-archived experience case studies for owner view and active public campaign view.';
