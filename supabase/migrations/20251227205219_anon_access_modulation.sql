-- Revoked Anon Access for functions only used with authenticated users

REVOKE EXECUTE ON FUNCTION public.get_case_studies_by_project(uuid) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.archive_project(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.publish_campaign(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.switch_campaign(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.insert_lead_validated(uuid, varchar, varchar, varchar, varchar, varchar, boolean) FROM anon;

REVOKE EXECUTE ON FUNCTION public.handle_auth_user_update() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.prevent_project_unarchive() FROM anon;

