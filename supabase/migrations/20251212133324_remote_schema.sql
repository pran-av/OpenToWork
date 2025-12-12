


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."campaign_status_enum" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'PAUSED'
);


ALTER TYPE "public"."campaign_status_enum" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."archive_project"("p_project_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_is_already_archived BOOLEAN;
BEGIN
  -- Check if already archived
  SELECT is_archived INTO v_is_already_archived
  FROM projects
  WHERE project_id = p_project_id;

  IF v_is_already_archived THEN
    RETURN jsonb_build_object('success', false, 'error', 'Project is already archived');
  END IF;

  -- Pause all ACTIVE campaigns and archive project in single transaction
  UPDATE campaigns SET campaign_status = 'PAUSED' 
  WHERE project_id = p_project_id AND campaign_status = 'ACTIVE';
  
  UPDATE projects SET is_archived = TRUE WHERE project_id = p_project_id;

  RETURN jsonb_build_object('success', true);
END;
$$;


ALTER FUNCTION "public"."archive_project"("p_project_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_auth_user_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Update public.users when auth.users is updated (e.g., login, email verification)
  UPDATE public.users
  SET 
    user_email = NEW.email,
    is_email_verified = NEW.email_confirmed_at IS NOT NULL,
    last_login_at = COALESCE(NEW.last_sign_in_at, last_login_at, NOW())
  WHERE user_id = NEW.id;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_auth_user_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_auth_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_existing_user_id UUID;
  v_user_email TEXT;
BEGIN
  -- Skip anonymous users - they don't need to be in public.users
  -- Anonymous users are only used for RLS via JWT, not for ownership chains
  IF NEW.is_anonymous = TRUE THEN
    RAISE NOTICE 'Skipping sync for anonymous user: %', NEW.id;
    RETURN NEW;
  END IF;

  -- Handle users without email (shouldn't happen for non-anonymous, but safety check)
  IF NEW.email IS NULL OR NEW.email = '' THEN
    -- This shouldn't happen for non-anonymous users, but log and skip if it does
    RAISE NOTICE 'Skipping sync for user without email: %', NEW.id;
    RETURN NEW;
  END IF;

  -- Use the actual email for non-anonymous users
  v_user_email := NEW.email;

  -- Check if user already exists by email (to handle email-based duplicates)
  SELECT user_id INTO v_existing_user_id
  FROM public.users
  WHERE user_email = v_user_email
  LIMIT 1;

  IF v_existing_user_id IS NOT NULL THEN
    -- User exists by email - update with auth.users.id and sync data
    UPDATE public.users
    SET 
      user_id = NEW.id,  -- Update FK to match auth.users.id
      user_email = v_user_email,
      is_email_verified = NEW.email_confirmed_at IS NOT NULL,
      last_login_at = COALESCE(NEW.last_sign_in_at, NOW()),
      -- Only update created_at if it's null (preserve original creation time)
      created_at = COALESCE(created_at, NOW())
    WHERE user_id = v_existing_user_id;
  ELSE
    -- New user - insert with auth.users.id as FK
    INSERT INTO public.users (
      user_id,  -- FK from auth.users.id
      user_email,
      is_email_verified,
      created_at,
      last_login_at,
      current_payment_plan
    )
    VALUES (
      NEW.id,  -- FK from auth.users.id
      v_user_email,
      NEW.email_confirmed_at IS NOT NULL,
      COALESCE(NEW.created_at, NOW()),
      COALESCE(NEW.last_sign_in_at, NOW()),
      'free'  -- Default payment plan
    )
    ON CONFLICT (user_id) DO UPDATE
    SET 
      user_email = EXCLUDED.user_email,
      is_email_verified = EXCLUDED.is_email_verified,
      last_login_at = COALESCE(EXCLUDED.last_login_at, NOW());
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_auth_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_campaign_available_for_leads"("p_campaign_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_is_available BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM campaigns c
    INNER JOIN projects p ON p.project_id = c.project_id
    WHERE c.campaign_id = p_campaign_id
      AND c.campaign_status = 'ACTIVE'::campaign_status_enum
      AND p.is_archived = false
  ) INTO v_is_available;
  
  RETURN COALESCE(v_is_available, false);
END;
$$;


ALTER FUNCTION "public"."is_campaign_available_for_leads"("p_campaign_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_campaign_available_for_leads"("p_campaign_id" "uuid") IS 'Security definer function to check if a campaign is available for lead submission. Returns true if campaign is ACTIVE and project is not archived. Used by RLS policy on leads table.';



CREATE OR REPLACE FUNCTION "public"."is_campaign_publishable"("p_campaign_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_has_client_name BOOLEAN;
  v_has_client_summary BOOLEAN;
  v_has_cta BOOLEAN;
  v_has_services BOOLEAN;
  v_all_services_have_cases BOOLEAN;
BEGIN
  -- Check client_name and client_summary in campaign_structure
  SELECT 
    (campaign_structure->>'client_name') IS NOT NULL 
    AND (campaign_structure->>'client_name') != '',
    (campaign_structure->>'client_summary') IS NOT NULL 
    AND (campaign_structure->>'client_summary') != ''
  INTO v_has_client_name, v_has_client_summary
  FROM campaigns
  WHERE campaign_id = p_campaign_id;

  IF NOT v_has_client_name OR NOT v_has_client_summary THEN
    RETURN FALSE;
  END IF;

  -- Check if at least one CTA exists
  SELECT 
    (cta_config->>'schedule_meeting') IS NOT NULL 
    OR (cta_config->>'mailto') IS NOT NULL 
    OR (cta_config->>'linkedin') IS NOT NULL 
    OR (cta_config->>'phone') IS NOT NULL
  INTO v_has_cta
  FROM campaigns
  WHERE campaign_id = p_campaign_id;

  IF NOT v_has_cta THEN
    RETURN FALSE;
  END IF;

  -- Check if at least one service exists
  SELECT EXISTS(
    SELECT 1 FROM client_services WHERE campaign_id = p_campaign_id
  ) INTO v_has_services;

  IF NOT v_has_services THEN
    RETURN FALSE;
  END IF;

  -- Check if all services have at least one case study
  SELECT NOT EXISTS(
    SELECT 1 
    FROM client_services cs
    WHERE cs.campaign_id = p_campaign_id
    AND NOT EXISTS(
      SELECT 1 FROM case_studies WHERE client_service_id = cs.client_service_id
    )
  ) INTO v_all_services_have_cases;

  RETURN v_all_services_have_cases;
END;
$$;


ALTER FUNCTION "public"."is_campaign_publishable"("p_campaign_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_project_unarchive"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- If trying to change is_archived from TRUE to FALSE, raise error
  IF OLD.is_archived = TRUE AND NEW.is_archived = FALSE THEN
    RAISE EXCEPTION 'Cannot unarchive a project. Once archived, a project cannot be activated again.';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_project_unarchive"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."publish_campaign"("p_project_id" "uuid", "p_campaign_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_project_user_id UUID;
  v_campaign_project_id UUID;
  v_campaign_status campaign_status_enum;
  v_active_campaign_id UUID;
  v_project_url TEXT;
  v_is_publishable BOOLEAN;
BEGIN
  -- Verify campaign belongs to project
  SELECT project_id, campaign_status INTO v_campaign_project_id, v_campaign_status
  FROM campaigns
  WHERE campaign_id = p_campaign_id;

  IF v_campaign_project_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Campaign not found');
  END IF;

  IF v_campaign_project_id != p_project_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Campaign does not belong to project');
  END IF;

  -- Check if campaign is in DRAFT status
  IF v_campaign_status != 'DRAFT' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only DRAFT campaigns can be published');
  END IF;

  -- Check if there's already an ACTIVE campaign
  SELECT campaign_id INTO v_active_campaign_id
  FROM campaigns
  WHERE project_id = p_project_id AND campaign_status = 'ACTIVE'
  LIMIT 1;

  IF v_active_campaign_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Project already has an ACTIVE campaign. Use switch_campaign instead.');
  END IF;

  -- Check if campaign is publishable
  SELECT is_campaign_publishable(p_campaign_id) INTO v_is_publishable;
  
  IF NOT v_is_publishable THEN
    RETURN jsonb_build_object('success', false, 'error', 'Campaign is not publishable. Ensure all mandatory fields are filled.');
  END IF;

  -- Verify project is not archived
  SELECT user_id INTO v_project_user_id
  FROM projects
  WHERE project_id = p_project_id AND is_archived = FALSE;

  IF v_project_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Project is archived');
  END IF;

  -- Generate project URL if not exists
  v_project_url := '/project/' || p_project_id::TEXT;

  -- Update campaign to ACTIVE and set project URL in single transaction
  UPDATE campaigns SET campaign_status = 'ACTIVE' WHERE campaign_id = p_campaign_id;
  UPDATE projects SET project_url = v_project_url WHERE project_id = p_project_id AND project_url IS NULL;

  RETURN jsonb_build_object('success', true, 'project_url', v_project_url);
END;
$$;


ALTER FUNCTION "public"."publish_campaign"("p_project_id" "uuid", "p_campaign_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."switch_campaign"("p_project_id" "uuid", "p_target_campaign_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_current_active_id UUID;
  v_target_status campaign_status_enum;
  v_target_project_id UUID;
  v_is_publishable BOOLEAN;
BEGIN
  -- Find current ACTIVE campaign
  SELECT campaign_id INTO v_current_active_id
  FROM campaigns
  WHERE project_id = p_project_id AND campaign_status = 'ACTIVE'
  LIMIT 1;

  IF v_current_active_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No ACTIVE campaign found. Use publish_campaign instead.');
  END IF;

  -- Verify target campaign
  SELECT project_id, campaign_status INTO v_target_project_id, v_target_status
  FROM campaigns
  WHERE campaign_id = p_target_campaign_id;

  IF v_target_project_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target campaign not found');
  END IF;

  IF v_target_project_id != p_project_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target campaign does not belong to project');
  END IF;

  IF v_target_status NOT IN ('DRAFT', 'PAUSED') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target campaign must be DRAFT or PAUSED');
  END IF;

  -- Check if target is publishable
  SELECT is_campaign_publishable(p_target_campaign_id) INTO v_is_publishable;
  
  IF NOT v_is_publishable THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target campaign is not publishable');
  END IF;

  -- Atomic switch: pause current, activate target
  UPDATE campaigns SET campaign_status = 'PAUSED' WHERE campaign_id = v_current_active_id;
  UPDATE campaigns SET campaign_status = 'ACTIVE' WHERE campaign_id = p_target_campaign_id;

  RETURN jsonb_build_object('success', true);
END;
$$;


ALTER FUNCTION "public"."switch_campaign"("p_project_id" "uuid", "p_target_campaign_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."campaigns" (
    "campaign_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "campaign_name" character varying(25) NOT NULL,
    "campaign_status" "public"."campaign_status_enum" DEFAULT 'DRAFT'::"public"."campaign_status_enum" NOT NULL,
    "campaign_structure" "jsonb" NOT NULL,
    "cta_config" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "check_campaign_structure" CHECK ((("campaign_structure" ? 'client_name'::"text") AND ("campaign_structure" ? 'client_summary'::"text") AND ("jsonb_typeof"(("campaign_structure" -> 'client_name'::"text")) = 'string'::"text") AND ("jsonb_typeof"(("campaign_structure" -> 'client_summary'::"text")) = 'string'::"text") AND ("length"(("campaign_structure" ->> 'client_name'::"text")) <= 25) AND ("length"(("campaign_structure" ->> 'client_summary'::"text")) <= 400)))
);


ALTER TABLE "public"."campaigns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."case_studies" (
    "case_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_service_id" "uuid" NOT NULL,
    "case_name" character varying(75) NOT NULL,
    "case_summary" character varying(150),
    "case_duration" character varying(255),
    "case_highlights" "text" NOT NULL,
    "case_study_url" character varying(500),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."case_studies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_services" (
    "client_service_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "client_service_name" character varying(255) NOT NULL,
    "order_index" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."client_services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."leads" (
    "lead_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "lead_name" character varying NOT NULL,
    "lead_company" character varying NOT NULL,
    "lead_email" character varying NOT NULL,
    "lead_phone_isd" character varying,
    "lead_phone" character varying,
    "meeting_scheduled" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."leads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "project_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "project_name" character varying(75) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "project_url" "text",
    "is_archived" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "user_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_first_name" character varying(255),
    "user_last_name" character varying(255),
    "user_email" character varying(255) NOT NULL,
    "is_email_verified" boolean DEFAULT false NOT NULL,
    "user_location" character varying(255),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_login_at" timestamp with time zone,
    "current_payment_plan" character varying(20),
    CONSTRAINT "users_current_payment_plan_check" CHECK ((("current_payment_plan")::"text" = ANY ((ARRAY['free'::character varying, 'lifetime'::character varying, 'pro'::character varying])::"text"[])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."widgets" (
    "widget_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "widget_name" character varying(100) NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "widget_text" character varying(25) NOT NULL,
    "design_attributes" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "check_design_attributes" CHECK ((("design_attributes" ? 'asset_type'::"text") AND ("design_attributes" ? 'color_primary'::"text") AND ("design_attributes" ? 'color_secondary'::"text") AND ("jsonb_typeof"(("design_attributes" -> 'asset_type'::"text")) = 'string'::"text") AND ("jsonb_typeof"(("design_attributes" -> 'color_primary'::"text")) = 'string'::"text") AND ("jsonb_typeof"(("design_attributes" -> 'color_secondary'::"text")) = 'string'::"text")))
);


ALTER TABLE "public"."widgets" OWNER TO "postgres";


ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_pkey" PRIMARY KEY ("campaign_id");



ALTER TABLE ONLY "public"."case_studies"
    ADD CONSTRAINT "case_studies_pkey" PRIMARY KEY ("case_id");



ALTER TABLE ONLY "public"."client_services"
    ADD CONSTRAINT "client_services_pkey" PRIMARY KEY ("client_service_id");



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_pkey" PRIMARY KEY ("lead_id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("project_id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_project_url_key" UNIQUE ("project_url");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_user_email_key" UNIQUE ("user_email");



ALTER TABLE ONLY "public"."widgets"
    ADD CONSTRAINT "widgets_pkey" PRIMARY KEY ("widget_id");



CREATE UNIQUE INDEX "idx_campaigns_one_active_per_project" ON "public"."campaigns" USING "btree" ("project_id") WHERE ("campaign_status" = 'ACTIVE'::"public"."campaign_status_enum");



CREATE INDEX "idx_campaigns_project_id" ON "public"."campaigns" USING "btree" ("project_id");



CREATE INDEX "idx_campaigns_status" ON "public"."campaigns" USING "btree" ("campaign_status");



CREATE INDEX "idx_case_studies_client_service_id" ON "public"."case_studies" USING "btree" ("client_service_id");



CREATE INDEX "idx_client_services_campaign_id" ON "public"."client_services" USING "btree" ("campaign_id");



CREATE INDEX "idx_client_services_order" ON "public"."client_services" USING "btree" ("campaign_id", "order_index");



CREATE INDEX "idx_leads_campaign_id" ON "public"."leads" USING "btree" ("campaign_id");



CREATE INDEX "idx_leads_created_at" ON "public"."leads" USING "btree" ("created_at");



CREATE INDEX "idx_leads_email" ON "public"."leads" USING "btree" ("lead_email");



CREATE INDEX "idx_projects_user_id" ON "public"."projects" USING "btree" ("user_id");



CREATE UNIQUE INDEX "idx_projects_user_name_unique" ON "public"."projects" USING "btree" ("user_id", "project_name");



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("user_email");



CREATE INDEX "idx_widgets_campaign_id" ON "public"."widgets" USING "btree" ("campaign_id");



CREATE INDEX "idx_widgets_is_active" ON "public"."widgets" USING "btree" ("is_active");



CREATE OR REPLACE TRIGGER "trigger_prevent_unarchive" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_project_unarchive"();



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("project_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."case_studies"
    ADD CONSTRAINT "case_studies_client_service_id_fkey" FOREIGN KEY ("client_service_id") REFERENCES "public"."client_services"("client_service_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_services"
    ADD CONSTRAINT "client_services_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("campaign_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "fk_leads_campaign" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("campaign_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."widgets"
    ADD CONSTRAINT "widgets_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("campaign_id") ON DELETE CASCADE;



CREATE POLICY "Allow DELETE own leads for permanent users" ON "public"."leads" FOR DELETE USING (true);



CREATE POLICY "Allow INSERT for anonymous users if campaign exists" ON "public"."leads" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow SELECT own leads for permanent users" ON "public"."leads" FOR SELECT USING (true);



CREATE POLICY "Allow UPDATE own leads for permanent users" ON "public"."leads" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "Public can select non-archived projects" ON "public"."projects" FOR SELECT TO "authenticated", "anon" USING (("is_archived" = false));



ALTER TABLE "public"."campaigns" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "campaigns_delete_own" ON "public"."campaigns" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE (("projects"."project_id" = "campaigns"."project_id") AND (EXISTS ( SELECT 1
           FROM "public"."users"
          WHERE (("users"."user_id" = "projects"."user_id") AND ("users"."user_id" = "auth"."uid"()))))))) OR false));



CREATE POLICY "campaigns_insert_own" ON "public"."campaigns" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE (("projects"."project_id" = "campaigns"."project_id") AND (EXISTS ( SELECT 1
           FROM "public"."users"
          WHERE (("users"."user_id" = "projects"."user_id") AND ("users"."user_id" = "auth"."uid"())))) AND ("projects"."is_archived" = false)))) OR false));



CREATE POLICY "campaigns_select_for_authenticated_check" ON "public"."campaigns" FOR SELECT TO "authenticated" USING (("campaign_id" IS NOT NULL));



CREATE POLICY "campaigns_select_own" ON "public"."campaigns" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE (("projects"."project_id" = "campaigns"."project_id") AND (EXISTS ( SELECT 1
           FROM "public"."users"
          WHERE (("users"."user_id" = "projects"."user_id") AND ("users"."user_id" = "auth"."uid"()))))))) OR false));



CREATE POLICY "campaigns_select_public_active" ON "public"."campaigns" FOR SELECT USING ((("campaign_status" = 'ACTIVE'::"public"."campaign_status_enum") AND (EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE (("projects"."project_id" = "campaigns"."project_id") AND ("projects"."is_archived" = false))))));



CREATE POLICY "campaigns_update_own" ON "public"."campaigns" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE (("projects"."project_id" = "campaigns"."project_id") AND (EXISTS ( SELECT 1
           FROM "public"."users"
          WHERE (("users"."user_id" = "projects"."user_id") AND ("users"."user_id" = "auth"."uid"())))) AND ("projects"."is_archived" = false)))) OR false));



ALTER TABLE "public"."case_studies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "case_studies_delete_own" ON "public"."case_studies" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM (("public"."client_services"
     JOIN "public"."campaigns" ON (("campaigns"."campaign_id" = "client_services"."campaign_id")))
     JOIN "public"."projects" ON (("projects"."project_id" = "campaigns"."project_id")))
  WHERE (("client_services"."client_service_id" = "case_studies"."client_service_id") AND (EXISTS ( SELECT 1
           FROM "public"."users"
          WHERE (("users"."user_id" = "projects"."user_id") AND ("users"."user_id" = "auth"."uid"()))))))) OR false));



CREATE POLICY "case_studies_insert_own" ON "public"."case_studies" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM (("public"."client_services"
     JOIN "public"."campaigns" ON (("campaigns"."campaign_id" = "client_services"."campaign_id")))
     JOIN "public"."projects" ON (("projects"."project_id" = "campaigns"."project_id")))
  WHERE (("client_services"."client_service_id" = "case_studies"."client_service_id") AND (EXISTS ( SELECT 1
           FROM "public"."users"
          WHERE (("users"."user_id" = "projects"."user_id") AND ("users"."user_id" = "auth"."uid"())))) AND ("projects"."is_archived" = false)))) OR false));



CREATE POLICY "case_studies_select_own" ON "public"."case_studies" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM (("public"."client_services"
     JOIN "public"."campaigns" ON (("campaigns"."campaign_id" = "client_services"."campaign_id")))
     JOIN "public"."projects" ON (("projects"."project_id" = "campaigns"."project_id")))
  WHERE (("client_services"."client_service_id" = "case_studies"."client_service_id") AND (EXISTS ( SELECT 1
           FROM "public"."users"
          WHERE (("users"."user_id" = "projects"."user_id") AND ("users"."user_id" = "auth"."uid"()))))))) OR false));



CREATE POLICY "case_studies_select_public" ON "public"."case_studies" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."client_services"
     JOIN "public"."campaigns" ON (("campaigns"."campaign_id" = "client_services"."campaign_id")))
     JOIN "public"."projects" ON (("projects"."project_id" = "campaigns"."project_id")))
  WHERE (("client_services"."client_service_id" = "case_studies"."client_service_id") AND ("campaigns"."campaign_status" = 'ACTIVE'::"public"."campaign_status_enum") AND ("projects"."is_archived" = false)))));



CREATE POLICY "case_studies_update_own" ON "public"."case_studies" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM (("public"."client_services"
     JOIN "public"."campaigns" ON (("campaigns"."campaign_id" = "client_services"."campaign_id")))
     JOIN "public"."projects" ON (("projects"."project_id" = "campaigns"."project_id")))
  WHERE (("client_services"."client_service_id" = "case_studies"."client_service_id") AND (EXISTS ( SELECT 1
           FROM "public"."users"
          WHERE (("users"."user_id" = "projects"."user_id") AND ("users"."user_id" = "auth"."uid"())))) AND ("projects"."is_archived" = false)))) OR false));



ALTER TABLE "public"."client_services" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "client_services_delete_own" ON "public"."client_services" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM ("public"."campaigns"
     JOIN "public"."projects" ON (("projects"."project_id" = "campaigns"."project_id")))
  WHERE (("campaigns"."campaign_id" = "client_services"."campaign_id") AND (EXISTS ( SELECT 1
           FROM "public"."users"
          WHERE (("users"."user_id" = "projects"."user_id") AND ("users"."user_id" = "auth"."uid"()))))))) OR false));



CREATE POLICY "client_services_insert_own" ON "public"."client_services" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM ("public"."campaigns"
     JOIN "public"."projects" ON (("projects"."project_id" = "campaigns"."project_id")))
  WHERE (("campaigns"."campaign_id" = "client_services"."campaign_id") AND (EXISTS ( SELECT 1
           FROM "public"."users"
          WHERE (("users"."user_id" = "projects"."user_id") AND ("users"."user_id" = "auth"."uid"())))) AND ("projects"."is_archived" = false)))) OR false));



CREATE POLICY "client_services_select_own" ON "public"."client_services" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM ("public"."campaigns"
     JOIN "public"."projects" ON (("projects"."project_id" = "campaigns"."project_id")))
  WHERE (("campaigns"."campaign_id" = "client_services"."campaign_id") AND (EXISTS ( SELECT 1
           FROM "public"."users"
          WHERE (("users"."user_id" = "projects"."user_id") AND ("users"."user_id" = "auth"."uid"()))))))) OR false));



CREATE POLICY "client_services_select_public" ON "public"."client_services" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."campaigns"
     JOIN "public"."projects" ON (("projects"."project_id" = "campaigns"."project_id")))
  WHERE (("campaigns"."campaign_id" = "client_services"."campaign_id") AND ("campaigns"."campaign_status" = 'ACTIVE'::"public"."campaign_status_enum") AND ("projects"."is_archived" = false)))));



CREATE POLICY "client_services_update_own" ON "public"."client_services" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM ("public"."campaigns"
     JOIN "public"."projects" ON (("projects"."project_id" = "campaigns"."project_id")))
  WHERE (("campaigns"."campaign_id" = "client_services"."campaign_id") AND (EXISTS ( SELECT 1
           FROM "public"."users"
          WHERE (("users"."user_id" = "projects"."user_id") AND ("users"."user_id" = "auth"."uid"())))) AND ("projects"."is_archived" = false)))) OR false));



ALTER TABLE "public"."leads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "projects_delete_own" ON "public"."projects" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."user_id" = "projects"."user_id") AND ("users"."user_id" = "auth"."uid"())))) OR false));



CREATE POLICY "projects_insert_own" ON "public"."projects" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."user_id" = "projects"."user_id") AND ("users"."user_id" = "auth"."uid"())))) OR false));



CREATE POLICY "projects_select_own" ON "public"."projects" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."user_id" = "projects"."user_id") AND ("users"."user_id" = "auth"."uid"())))) OR false));



CREATE POLICY "projects_update_own" ON "public"."projects" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."user_id" = "projects"."user_id") AND ("users"."user_id" = "auth"."uid"())))) OR false));



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_select_own" ON "public"."users" FOR SELECT USING ((("auth"."uid"() = "user_id") OR false));



CREATE POLICY "users_update_own" ON "public"."users" FOR UPDATE USING ((("auth"."uid"() = "user_id") OR false));



ALTER TABLE "public"."widgets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "widgets_delete_own" ON "public"."widgets" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM ("public"."campaigns"
     JOIN "public"."projects" ON (("projects"."project_id" = "campaigns"."project_id")))
  WHERE (("campaigns"."campaign_id" = "widgets"."campaign_id") AND (EXISTS ( SELECT 1
           FROM "public"."users"
          WHERE (("users"."user_id" = "projects"."user_id") AND ("users"."user_id" = "auth"."uid"()))))))) OR false));



CREATE POLICY "widgets_insert_own" ON "public"."widgets" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM ("public"."campaigns"
     JOIN "public"."projects" ON (("projects"."project_id" = "campaigns"."project_id")))
  WHERE (("campaigns"."campaign_id" = "widgets"."campaign_id") AND (EXISTS ( SELECT 1
           FROM "public"."users"
          WHERE (("users"."user_id" = "projects"."user_id") AND ("users"."user_id" = "auth"."uid"())))) AND ("projects"."is_archived" = false)))) OR false));



CREATE POLICY "widgets_select_own" ON "public"."widgets" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM ("public"."campaigns"
     JOIN "public"."projects" ON (("projects"."project_id" = "campaigns"."project_id")))
  WHERE (("campaigns"."campaign_id" = "widgets"."campaign_id") AND (EXISTS ( SELECT 1
           FROM "public"."users"
          WHERE (("users"."user_id" = "projects"."user_id") AND ("users"."user_id" = "auth"."uid"()))))))) OR false));



CREATE POLICY "widgets_select_public" ON "public"."widgets" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."campaigns"
     JOIN "public"."projects" ON (("projects"."project_id" = "campaigns"."project_id")))
  WHERE (("campaigns"."campaign_id" = "widgets"."campaign_id") AND ("campaigns"."campaign_status" = 'ACTIVE'::"public"."campaign_status_enum") AND ("projects"."is_archived" = false)))));



CREATE POLICY "widgets_update_own" ON "public"."widgets" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM ("public"."campaigns"
     JOIN "public"."projects" ON (("projects"."project_id" = "campaigns"."project_id")))
  WHERE (("campaigns"."campaign_id" = "widgets"."campaign_id") AND (EXISTS ( SELECT 1
           FROM "public"."users"
          WHERE (("users"."user_id" = "projects"."user_id") AND ("users"."user_id" = "auth"."uid"())))) AND ("projects"."is_archived" = false)))) OR false));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."archive_project"("p_project_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."archive_project"("p_project_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."archive_project"("p_project_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_auth_user_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_auth_user_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_auth_user_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_campaign_available_for_leads"("p_campaign_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_campaign_available_for_leads"("p_campaign_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_campaign_available_for_leads"("p_campaign_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_campaign_publishable"("p_campaign_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_campaign_publishable"("p_campaign_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_campaign_publishable"("p_campaign_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_project_unarchive"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_project_unarchive"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_project_unarchive"() TO "service_role";



GRANT ALL ON FUNCTION "public"."publish_campaign"("p_project_id" "uuid", "p_campaign_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."publish_campaign"("p_project_id" "uuid", "p_campaign_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."publish_campaign"("p_project_id" "uuid", "p_campaign_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."switch_campaign"("p_project_id" "uuid", "p_target_campaign_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."switch_campaign"("p_project_id" "uuid", "p_target_campaign_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."switch_campaign"("p_project_id" "uuid", "p_target_campaign_id" "uuid") TO "service_role";


















GRANT ALL ON TABLE "public"."campaigns" TO "anon";
GRANT ALL ON TABLE "public"."campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."campaigns" TO "service_role";



GRANT ALL ON TABLE "public"."case_studies" TO "anon";
GRANT ALL ON TABLE "public"."case_studies" TO "authenticated";
GRANT ALL ON TABLE "public"."case_studies" TO "service_role";



GRANT ALL ON TABLE "public"."client_services" TO "anon";
GRANT ALL ON TABLE "public"."client_services" TO "authenticated";
GRANT ALL ON TABLE "public"."client_services" TO "service_role";



GRANT ALL ON TABLE "public"."leads" TO "anon";
GRANT ALL ON TABLE "public"."leads" TO "authenticated";
GRANT ALL ON TABLE "public"."leads" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."widgets" TO "anon";
GRANT ALL ON TABLE "public"."widgets" TO "authenticated";
GRANT ALL ON TABLE "public"."widgets" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

drop policy "Public can select non-archived projects" on "public"."projects";

alter table "public"."users" drop constraint "users_current_payment_plan_check";

alter table "public"."users" add constraint "users_current_payment_plan_check" CHECK (((current_payment_plan)::text = ANY ((ARRAY['free'::character varying, 'lifetime'::character varying, 'pro'::character varying])::text[]))) not valid;

alter table "public"."users" validate constraint "users_current_payment_plan_check";


  create policy "Public can select non-archived projects"
  on "public"."projects"
  as permissive
  for select
  to anon, authenticated
using ((is_archived = false));


CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

CREATE TRIGGER on_auth_user_updated AFTER UPDATE ON auth.users FOR EACH ROW WHEN ((((old.email)::text IS DISTINCT FROM (new.email)::text) OR (old.email_confirmed_at IS DISTINCT FROM new.email_confirmed_at) OR (old.last_sign_in_at IS DISTINCT FROM new.last_sign_in_at))) EXECUTE FUNCTION public.handle_auth_user_update();


