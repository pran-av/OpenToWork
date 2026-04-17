DO $seed_legacy_public_case_data$
DECLARE
  v_uid UUID := '6b295bc9-9fd5-43b6-bc41-ea465bd0d6db'::UUID;
  v_project_id UUID;
  v_campaign_id UUID;
  v_client_service_id UUID;
  v_case_id UUID;
BEGIN
  -- Fixed owner for migration validation data.
  IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.user_id = v_uid) THEN
    RAISE EXCEPTION 'Seed user % not found in public.users', v_uid;
  END IF;

  INSERT INTO public.projects (user_id, project_name, is_archived)
  VALUES (v_uid, 'Seed Legacy Project', false)
  RETURNING project_id INTO v_project_id;

  INSERT INTO public.campaigns (
    project_id,
    campaign_name,
    campaign_status,
    campaign_structure,
    cta_config
  )
  VALUES (
    v_project_id,
    'Seed Legacy Campaign',
    'DRAFT'::public.campaign_status_enum,
    jsonb_build_object(
      'client_name', 'Seed Client',
      'client_summary', 'Seed summary for migration validation'
    ),
    jsonb_build_object('mailto', 'seed@example.com')
  )
  RETURNING campaign_id INTO v_campaign_id;

  INSERT INTO public.client_services (campaign_id, client_service_name, order_index)
  VALUES (v_campaign_id, 'Seed Legacy Service', 0)
  RETURNING client_service_id INTO v_client_service_id;

  INSERT INTO public.case_studies (
    client_service_id,
    case_name,
    case_summary,
    case_duration,
    case_highlights,
    case_study_url
  )
  VALUES (
    v_client_service_id,
    'Seed Legacy Case',
    'Seed legacy case summary',
    'Q1 2026',
    'seed-highlight-one;seed-highlight-two',
    'https://example.com/seed-legacy-case'
  )
  RETURNING case_id INTO v_case_id;

  RAISE NOTICE 'Seeded project_id=% campaign_id=% client_service_id=% case_id=%',
    v_project_id, v_campaign_id, v_client_service_id, v_case_id;
END;
$seed_legacy_public_case_data$;