-- Experience schema corrections:
-- 1) case_summary up to 700 characters
-- 2) case_duration optional (nullable, no blank constraint)
-- 3) Default service class presets per user (ENUM + seed + trigger on new users)
-- Follows rules-for-schema-creation: search_path = '', explicit REVOKE/GRANT on public RPCs.

-- ---------------------------------------------------------------------------
-- 1–2) Column and constraint changes on experience_case_studies
-- ---------------------------------------------------------------------------

ALTER TABLE internal.experience_case_studies
  ALTER COLUMN case_summary TYPE VARCHAR(700);

ALTER TABLE internal.experience_case_studies
  ALTER COLUMN case_duration DROP NOT NULL;

ALTER TABLE internal.experience_case_studies
  DROP CONSTRAINT IF EXISTS experience_case_duration_not_blank;

ALTER TABLE internal.experience_case_studies
  DROP CONSTRAINT IF EXISTS experience_case_summary_length;

ALTER TABLE internal.experience_case_studies
  ADD CONSTRAINT experience_case_summary_length CHECK (
    case_summary IS NULL OR char_length(case_summary) <= 700
  );

-- ---------------------------------------------------------------------------
-- 3) Preset ENUM and service_classes extensions
-- ---------------------------------------------------------------------------

DO $create_preset_enum$
BEGIN
  CREATE TYPE internal.experience_default_service_class AS ENUM (
    'ENGINEERING',
    'DESIGN',
    'PRODUCT_MANAGEMENT'
  );
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END;
$create_preset_enum$;

ALTER TABLE internal.service_classes
  ADD COLUMN IF NOT EXISTS is_system_default BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE internal.service_classes
  ADD COLUMN IF NOT EXISTS preset internal.experience_default_service_class NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_internal_service_classes_user_preset_unique
  ON internal.service_classes (user_id, preset)
  WHERE preset IS NOT NULL;

-- Promote existing matching names into presets before inserting defaults.
-- This prevents collisions with idx_internal_service_classes_user_name_unique.
UPDATE internal.service_classes sc
SET
  is_system_default = true,
  preset = 'ENGINEERING'::internal.experience_default_service_class
WHERE sc.preset IS NULL
  AND lower(sc.service_class_name) = lower('ENGINEERING')
  AND NOT EXISTS (
    SELECT 1 FROM internal.service_classes existing
    WHERE existing.user_id = sc.user_id
      AND existing.preset = 'ENGINEERING'::internal.experience_default_service_class
  );

UPDATE internal.service_classes sc
SET
  is_system_default = true,
  preset = 'DESIGN'::internal.experience_default_service_class
WHERE sc.preset IS NULL
  AND lower(sc.service_class_name) = lower('DESIGN')
  AND NOT EXISTS (
    SELECT 1 FROM internal.service_classes existing
    WHERE existing.user_id = sc.user_id
      AND existing.preset = 'DESIGN'::internal.experience_default_service_class
  );

UPDATE internal.service_classes sc
SET
  is_system_default = true,
  preset = 'PRODUCT_MANAGEMENT'::internal.experience_default_service_class
WHERE sc.preset IS NULL
  AND lower(sc.service_class_name) = lower('PRODUCT MANAGEMENT')
  AND NOT EXISTS (
    SELECT 1 FROM internal.service_classes existing
    WHERE existing.user_id = sc.user_id
      AND existing.preset = 'PRODUCT_MANAGEMENT'::internal.experience_default_service_class
  );

-- Seed default rows for every existing user (idempotent by preset and name)
INSERT INTO internal.service_classes (user_id, service_class_name, is_system_default, preset)
SELECT u.user_id, v.name, true, v.preset::internal.experience_default_service_class
FROM public.users u
CROSS JOIN (
  VALUES
    ('ENGINEERING', 'ENGINEERING'),
    ('DESIGN', 'DESIGN'),
    ('PRODUCT MANAGEMENT', 'PRODUCT_MANAGEMENT')
) AS v(name, preset)
WHERE NOT EXISTS (
  SELECT 1
  FROM internal.service_classes sc
  WHERE sc.user_id = u.user_id
    AND sc.preset = v.preset::internal.experience_default_service_class
)
AND NOT EXISTS (
  SELECT 1
  FROM internal.service_classes sc
  WHERE sc.user_id = u.user_id
    AND lower(sc.service_class_name) = lower(v.name)
);

-- New users: attach defaults when a public.users row is created
CREATE OR REPLACE FUNCTION public.ensure_default_experience_service_classes_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $ensure_defaults_for_new_user$
BEGIN
  INSERT INTO internal.service_classes (user_id, service_class_name, is_system_default, preset)
  SELECT NEW.user_id, 'ENGINEERING', true, 'ENGINEERING'::internal.experience_default_service_class
  WHERE NOT EXISTS (
    SELECT 1 FROM internal.service_classes sc
    WHERE sc.user_id = NEW.user_id AND sc.preset = 'ENGINEERING'::internal.experience_default_service_class
  )
  AND NOT EXISTS (
    SELECT 1 FROM internal.service_classes sc
    WHERE sc.user_id = NEW.user_id AND lower(sc.service_class_name) = lower('ENGINEERING')
  );

  INSERT INTO internal.service_classes (user_id, service_class_name, is_system_default, preset)
  SELECT NEW.user_id, 'DESIGN', true, 'DESIGN'::internal.experience_default_service_class
  WHERE NOT EXISTS (
    SELECT 1 FROM internal.service_classes sc
    WHERE sc.user_id = NEW.user_id AND sc.preset = 'DESIGN'::internal.experience_default_service_class
  )
  AND NOT EXISTS (
    SELECT 1 FROM internal.service_classes sc
    WHERE sc.user_id = NEW.user_id AND lower(sc.service_class_name) = lower('DESIGN')
  );

  INSERT INTO internal.service_classes (user_id, service_class_name, is_system_default, preset)
  SELECT NEW.user_id, 'PRODUCT MANAGEMENT', true, 'PRODUCT_MANAGEMENT'::internal.experience_default_service_class
  WHERE NOT EXISTS (
    SELECT 1 FROM internal.service_classes sc
    WHERE sc.user_id = NEW.user_id AND sc.preset = 'PRODUCT_MANAGEMENT'::internal.experience_default_service_class
  )
  AND NOT EXISTS (
    SELECT 1 FROM internal.service_classes sc
    WHERE sc.user_id = NEW.user_id AND lower(sc.service_class_name) = lower('PRODUCT MANAGEMENT')
  );

  RETURN NEW;
END;
$ensure_defaults_for_new_user$;

REVOKE EXECUTE ON FUNCTION public.ensure_default_experience_service_classes_for_new_user() FROM public;
REVOKE EXECUTE ON FUNCTION public.ensure_default_experience_service_classes_for_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.ensure_default_experience_service_classes_for_new_user() FROM authenticated;

DROP TRIGGER IF EXISTS trg_users_insert_default_experience_service_classes ON public.users;
CREATE TRIGGER trg_users_insert_default_experience_service_classes
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_default_experience_service_classes_for_new_user();

COMMENT ON FUNCTION public.ensure_default_experience_service_classes_for_new_user() IS
  'Inserts three preset experience service classes for a new public.users row. SECURITY DEFINER; not callable as RPC.';

-- ---------------------------------------------------------------------------
-- Public RPC: list preset ENUM labels (for UI dropdown grouping)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.list_experience_default_service_class_presets()
RETURNS TABLE (
  preset TEXT,
  display_label TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $list_experience_default_service_class_presets$
  SELECT x.preset::TEXT, x.display_label
  FROM (
    VALUES
      ('ENGINEERING'::internal.experience_default_service_class, 'ENGINEERING'),
      ('DESIGN'::internal.experience_default_service_class, 'DESIGN'),
      ('PRODUCT_MANAGEMENT'::internal.experience_default_service_class, 'PRODUCT MANAGEMENT')
  ) AS x(preset, display_label);
$list_experience_default_service_class_presets$;

REVOKE EXECUTE ON FUNCTION public.list_experience_default_service_class_presets() FROM public;
REVOKE EXECUTE ON FUNCTION public.list_experience_default_service_class_presets() FROM anon;
GRANT EXECUTE ON FUNCTION public.list_experience_default_service_class_presets() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_experience_default_service_class_presets() TO service_role;

COMMENT ON FUNCTION public.list_experience_default_service_class_presets() IS
  'Returns canonical preset service class ENUM values and display labels for the experience UI.';

-- ---------------------------------------------------------------------------
-- Replace RPCs: VARCHAR(700) summaries, optional duration, UPPER(service name)
-- ---------------------------------------------------------------------------

-- PostgreSQL cannot change OUT-parameter row types via CREATE OR REPLACE.
-- Drop older signatures first so recreated RPCs can return expanded columns.
DROP FUNCTION IF EXISTS public.get_experience_service_classes();
DROP FUNCTION IF EXISTS public.create_experience_service_class(TEXT);
DROP FUNCTION IF EXISTS public.get_experience_case_studies();
DROP FUNCTION IF EXISTS public.create_experience_case_study(UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.update_experience_case_study(UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS public.search_experience_case_studies(TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.get_attached_experience_case_studies_for_campaign(UUID);

CREATE OR REPLACE FUNCTION public.get_experience_service_classes()
RETURNS TABLE (
  service_class_id UUID,
  user_id UUID,
  service_class_name VARCHAR(80),
  is_system_default BOOLEAN,
  preset TEXT,
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
    upper(sc.service_class_name)::VARCHAR(80) AS service_class_name,
    sc.is_system_default,
    sc.preset::TEXT,
    sc.is_archived,
    sc.archived_at,
    sc.created_at,
    sc.updated_at
  FROM internal.service_classes sc
  WHERE sc.user_id = v_uid
    AND sc.is_archived = false
  ORDER BY
    CASE sc.preset
      WHEN 'ENGINEERING'::internal.experience_default_service_class THEN 1
      WHEN 'DESIGN'::internal.experience_default_service_class THEN 2
      WHEN 'PRODUCT_MANAGEMENT'::internal.experience_default_service_class THEN 3
      ELSE 4
    END,
    upper(sc.service_class_name) ASC;
END;
$get_experience_service_classes$;

CREATE OR REPLACE FUNCTION public.create_experience_service_class(
  p_service_class_name TEXT
)
RETURNS TABLE (
  service_class_id UUID,
  user_id UUID,
  service_class_name VARCHAR(80),
  is_system_default BOOLEAN,
  preset TEXT,
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
  v_name TEXT;
BEGIN
  SELECT uid INTO v_uid FROM (SELECT auth.uid() AS uid) me;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF p_service_class_name IS NULL OR btrim(p_service_class_name) = '' THEN
    RAISE EXCEPTION 'Service class name is required';
  END IF;

  v_name := upper(btrim(p_service_class_name));

  RETURN QUERY
  INSERT INTO internal.service_classes (user_id, service_class_name, is_system_default, preset)
  VALUES (v_uid, v_name, false, NULL)
  RETURNING
    internal.service_classes.service_class_id,
    internal.service_classes.user_id,
    internal.service_classes.service_class_name,
    internal.service_classes.is_system_default,
    internal.service_classes.preset::TEXT,
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
  case_summary VARCHAR(700),
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
    upper(sc.service_class_name)::VARCHAR(80) AS service_class_name,
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
  case_summary VARCHAR(700),
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
  v_summary TEXT;
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
  IF p_display_year IS NULL THEN
    RAISE EXCEPTION 'Display year is required';
  END IF;
  IF p_case_highlights IS NULL OR btrim(p_case_highlights) = '' THEN
    RAISE EXCEPTION 'Case highlights are required';
  END IF;

  v_summary := NULLIF(btrim(COALESCE(p_case_summary, '')), '');
  IF v_summary IS NOT NULL AND char_length(v_summary) > 700 THEN
    RAISE EXCEPTION 'Case summary must be at most 700 characters';
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
    v_summary,
    NULLIF(btrim(COALESCE(p_case_duration, '')), ''),
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
  case_summary VARCHAR(700),
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
  v_summary TEXT;
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

  IF p_case_summary IS NOT NULL THEN
    v_summary := NULLIF(btrim(p_case_summary), '');
    IF v_summary IS NOT NULL AND char_length(v_summary) > 700 THEN
      RAISE EXCEPTION 'Case summary must be at most 700 characters';
    END IF;
  END IF;

  RETURN QUERY
  UPDATE internal.experience_case_studies ecs
  SET
    case_name = COALESCE(NULLIF(btrim(COALESCE(p_case_name, '')), ''), ecs.case_name),
    case_summary = CASE
      WHEN p_case_summary IS NULL THEN ecs.case_summary
      ELSE NULLIF(btrim(p_case_summary), '')
    END,
    case_duration = CASE
      WHEN p_case_duration IS NULL THEN ecs.case_duration
      WHEN btrim(p_case_duration) = '' THEN NULL
      ELSE btrim(p_case_duration)
    END,
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
  case_summary VARCHAR(700),
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
    upper(sc.service_class_name)::VARCHAR(80) AS service_class_name,
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

-- Re-apply grants (CREATE OR REPLACE preserves grants on same signature; new function needs grants)
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

REVOKE EXECUTE ON FUNCTION public.get_attached_experience_case_studies_for_campaign(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.get_attached_experience_case_studies_for_campaign(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_attached_experience_case_studies_for_campaign(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_attached_experience_case_studies_for_campaign(UUID) TO service_role;

COMMENT ON FUNCTION public.get_experience_service_classes() IS
  'Returns non-archived service classes for the authenticated user; presets first; names uppercased.';
COMMENT ON FUNCTION public.create_experience_service_class(TEXT) IS
  'Creates a user-defined service class; name stored uppercased.';
COMMENT ON FUNCTION public.get_experience_case_studies() IS
  'Returns non-archived case studies with uppercased service class labels; summary up to 700 chars.';
COMMENT ON FUNCTION public.create_experience_case_study(UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT) IS
  'Creates an experience case study; duration optional; summary up to 700 chars.';
COMMENT ON FUNCTION public.update_experience_case_study(UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, BOOLEAN) IS
  'Updates experience case study; empty duration clears to NULL; summary up to 700 chars.';
COMMENT ON FUNCTION public.search_experience_case_studies(TEXT, INTEGER) IS
  'Searches user-owned case studies by name; summary up to 700 chars in result.';
COMMENT ON FUNCTION public.get_attached_experience_case_studies_for_campaign(UUID) IS
  'Returns attached case studies for owner or active public campaign; uppercased service class name.';
