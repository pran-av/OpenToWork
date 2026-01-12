-- Migration: LinkedIn OAuth Schema
-- Adds tables and columns for LinkedIn OAuth integration and profile management

-- Add new columns to users table for profile enrichment
ALTER TABLE "public"."users"
  ADD COLUMN IF NOT EXISTS "display_name" character varying(255),
  ADD COLUMN IF NOT EXISTS "avatar_url" text,
  ADD COLUMN IF NOT EXISTS "country" character varying(255),
  ADD COLUMN IF NOT EXISTS "language" character varying(10),
  ADD COLUMN IF NOT EXISTS "profile_completed" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "linkedin_id" character varying(255),
  ADD COLUMN IF NOT EXISTS "profile_last_updated" timestamp with time zone;

-- Create provider_profiles table to store provider response data
CREATE TABLE IF NOT EXISTS "public"."provider_profiles" (
    "provider_profile_id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL,
    "provider" character varying(50) NOT NULL,
    "provider_sub" character varying(255) NOT NULL,
    "provider_data" jsonb NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "provider_profiles_pkey" PRIMARY KEY ("provider_profile_id"),
    CONSTRAINT "provider_profiles_user_id_fkey" FOREIGN KEY ("user_id") 
      REFERENCES "public"."users"("user_id") ON DELETE CASCADE
);

-- Create index on provider_sub for quick lookups
CREATE INDEX IF NOT EXISTS "idx_provider_profiles_provider_sub" 
  ON "public"."provider_profiles"("provider_sub");

-- Create index on user_id for user lookups
CREATE INDEX IF NOT EXISTS "idx_provider_profiles_user_id" 
  ON "public"."provider_profiles"("user_id");

-- Create unique constraint on (provider, provider_sub) to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS "idx_provider_profiles_provider_sub_unique" 
  ON "public"."provider_profiles"("provider", "provider_sub");

-- Create user_identity_meta table to track profile field updates
CREATE TABLE IF NOT EXISTS "public"."user_identity_meta" (
    "meta_id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL,
    "source" character varying(50) NOT NULL, -- 'linkedin' or 'manual'
    "field" character varying(50) NOT NULL, -- field name like 'display_name', 'first_name', etc.
    "confidence" boolean DEFAULT true NOT NULL,
    "saved_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "user_identity_meta_pkey" PRIMARY KEY ("meta_id"),
    CONSTRAINT "user_identity_meta_user_id_fkey" FOREIGN KEY ("user_id") 
      REFERENCES "public"."users"("user_id") ON DELETE CASCADE
);

-- Create index on user_id for user lookups
CREATE INDEX IF NOT EXISTS "idx_user_identity_meta_user_id" 
  ON "public"."user_identity_meta"("user_id");

-- Create index on (user_id, field) for field-specific lookups
CREATE INDEX IF NOT EXISTS "idx_user_identity_meta_user_field" 
  ON "public"."user_identity_meta"("user_id", "field");

-- Add RLS policies for provider_profiles
ALTER TABLE "public"."provider_profiles" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_provider_profiles_own"
  ON "public"."provider_profiles"
  FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "insert_provider_profiles_own"
  ON "public"."provider_profiles"
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

-- Add RLS policies for user_identity_meta
ALTER TABLE "public"."user_identity_meta" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_user_identity_meta_own"
  ON "public"."user_identity_meta"
  FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "insert_user_identity_meta_own"
  ON "public"."user_identity_meta"
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

-- Add comment for documentation
COMMENT ON TABLE "public"."provider_profiles" IS 'Stores OAuth provider response data (e.g., LinkedIn OIDC response)';
COMMENT ON TABLE "public"."user_identity_meta" IS 'Tracks the source and metadata for profile field updates';

