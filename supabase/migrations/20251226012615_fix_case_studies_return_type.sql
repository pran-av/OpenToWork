-- Migration: Fix get_case_studies_by_project Return Type Mismatch
-- This migration fixes the type mismatch error:
-- "Returned type character varying(150) does not match expected type text in column 4"
-- 
-- The function's return type declaration doesn't match the actual table column types.
-- Table columns: case_summary varchar(150), case_duration varchar(255), case_study_url varchar(500)
-- Function was returning: case_summary text, case_duration varchar(50), case_study_url text
--
-- Note: PostgreSQL doesn't allow changing return types with CREATE OR REPLACE,
-- so we must DROP the function first, then recreate it with correct types.

-- Drop the existing function to allow return type change
DROP FUNCTION IF EXISTS public.get_case_studies_by_project(uuid);

-- Recreate the function with correct return types matching the table schema
CREATE FUNCTION public.get_case_studies_by_project(
  p_project_id uuid
) RETURNS TABLE (
  case_id uuid,
  client_service_id uuid,
  case_name varchar(100),
  case_summary varchar(150),  -- Fixed: was text, now matches table varchar(150)
  case_duration varchar(255),  -- Fixed: was varchar(50), now matches table varchar(255)
  case_highlights text,
  case_study_url varchar(500), -- Fixed: was text, now matches table varchar(500)
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
  FROM public.case_studies cs
  JOIN public.client_services clis ON clis.client_service_id = cs.client_service_id
  JOIN public.campaigns c ON c.campaign_id = clis.campaign_id
  WHERE c.project_id = p_project_id
    AND c.campaign_status = 'ACTIVE'::public.campaign_status_enum
  ORDER BY cs.created_at DESC;
END;
$$;
