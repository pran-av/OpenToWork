-- Migration: Add manual_linking_rejected column to users table
-- Tracks if user has rejected/dismissed the manual LinkedIn linking dialog

ALTER TABLE "public"."users"
  ADD COLUMN IF NOT EXISTS "manual_linking_rejected" boolean DEFAULT false NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN "public"."users"."manual_linking_rejected" IS 'Tracks if user has rejected/dismissed the manual LinkedIn identity linking dialog. If true, the linking dialog will not be shown.';

