-- Harden permissions and security model per prd-files/permissions.md (Part 1)
-- Changes:
-- 1) Convert archive_project, publish_campaign, switch_campaign from SECURITY DEFINER to SECURITY INVOKER
--    so RLS ownership checks on projects/campaigns are enforced.
-- 2) Revoke EXECUTE on check_campaign_ownership from authenticated (keep it as an orphan helper only).
-- 3) Revoke EXECUTE on handle_auth_user_update and handle_new_auth_user from authenticated
--    since they are internal auth.users → public.users sync triggers only.

-- 1) Convert project/campaign lifecycle RPCs to SECURITY INVOKER
--    These functions already rely on RLS on public.projects/public.campaigns
--    so they don't need definer-level privileges.

DO $$
BEGIN
  -- archive_project(p_project_id uuid)
  BEGIN
    ALTER FUNCTION public.archive_project(uuid) SECURITY INVOKER;
  EXCEPTION
    WHEN undefined_function THEN
      -- Function may not exist in some environments; ignore
      NULL;
  END;

  -- publish_campaign(p_project_id uuid, p_campaign_id uuid)
  BEGIN
    ALTER FUNCTION public.publish_campaign(uuid, uuid) SECURITY INVOKER;
  EXCEPTION
    WHEN undefined_function THEN
      NULL;
  END;

  -- switch_campaign(p_project_id uuid, p_target_campaign_id uuid)
  BEGIN
    ALTER FUNCTION public.switch_campaign(uuid, uuid) SECURITY INVOKER;
  EXCEPTION
    WHEN undefined_function THEN
      NULL;
  END;
END $$;


-- 2) check_campaign_ownership: revoke execute from authenticated
--    Function is now an orphan helper; no app/worker code calls it directly.

DO $$
BEGIN
  BEGIN
    REVOKE EXECUTE ON FUNCTION public.check_campaign_ownership(UUID) FROM authenticated;
  EXCEPTION
    WHEN undefined_function THEN
      NULL;
  END;
END $$;


-- 3) handle_auth_user_update / handle_new_auth_user: revoke execute from authenticated
--    These are invoked via triggers on auth.users and are not meant to be called as RPCs.

DO $$
BEGIN
  BEGIN
    REVOKE EXECUTE ON FUNCTION public.handle_auth_user_update() FROM authenticated;
  EXCEPTION
    WHEN undefined_function THEN
      NULL;
  END;

  BEGIN
    REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM authenticated;
  EXCEPTION
    WHEN undefined_function THEN
      NULL;
  END;
END $$;


