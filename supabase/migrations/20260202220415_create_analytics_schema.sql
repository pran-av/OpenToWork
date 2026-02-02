-- Migration: Create Analytics Schema for Tracking Campaign Analytics
-- This migration creates the internal schema tables for tracking sessions and events
-- Analytics data is stored in internal schema for security

-- Step 1: Ensure internal schema exists (should already exist from previous migrations)
CREATE SCHEMA IF NOT EXISTS internal;
GRANT USAGE ON SCHEMA internal TO authenticated;
-- Do not grant to anon - internal schema is for authenticated operations only

-- Step 2: Create ENUM types for session flags and event types
CREATE TYPE internal.session_flag_enum AS ENUM (
  'new_session',
  'actual_session',
  'engaged_session'
);

CREATE TYPE internal.event_type_enum AS ENUM (
  'link_open',
  'button_click'
);

-- Step 3: Create internal.sessions table
CREATE TABLE IF NOT EXISTS internal.sessions (
  session_id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  project_id UUID NOT NULL REFERENCES public.projects(project_id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(campaign_id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  active_time_spent INTEGER NOT NULL DEFAULT 0, -- seconds
  user_agent_hash TEXT,
  session_flag internal.session_flag_enum NOT NULL DEFAULT 'new_session',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sessions_session_id_unique UNIQUE (session_id)
);

-- Step 4: Create internal.events table
CREATE TABLE IF NOT EXISTS internal.events (
  event_id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES internal.sessions(session_id) ON DELETE CASCADE,
  event_type internal.event_type_enum NOT NULL,
  metadata JSONB,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT events_session_event_unique UNIQUE (session_id, event_id)
);

-- Step 5: Create indexes for performance
-- Index for querying sessions by campaign and flag (for analytics)
CREATE INDEX IF NOT EXISTS idx_sessions_campaign_flag 
  ON internal.sessions(campaign_id, session_flag) 
  WHERE campaign_id IS NOT NULL;

-- Index for querying sessions by project
CREATE INDEX IF NOT EXISTS idx_sessions_project 
  ON internal.sessions(project_id);

-- Index for querying sessions by user
CREATE INDEX IF NOT EXISTS idx_sessions_user 
  ON internal.sessions(user_id) 
  WHERE user_id IS NOT NULL;

-- Index for querying events by session
CREATE INDEX IF NOT EXISTS idx_events_session 
  ON internal.events(session_id);

-- Index for querying events by timestamp (for time-based queries)
CREATE INDEX IF NOT EXISTS idx_events_timestamp 
  ON internal.events(timestamp);

-- Index for querying events by type
CREATE INDEX IF NOT EXISTS idx_events_type 
  ON internal.events(event_type);

-- Step 6: Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION internal.update_sessions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Revoke execute permissions from public and anon (trigger functions should not be called directly)
REVOKE EXECUTE ON FUNCTION internal.update_sessions_updated_at() FROM public;
REVOKE EXECUTE ON FUNCTION internal.update_sessions_updated_at() FROM anon;

CREATE TRIGGER trigger_update_sessions_updated_at
  BEFORE UPDATE ON internal.sessions
  FOR EACH ROW
  EXECUTE FUNCTION internal.update_sessions_updated_at();

-- Step 7: Add comments for documentation
COMMENT ON TABLE internal.sessions IS 'Tracks user sessions for campaign analytics. Sessions are created when a lead opens a campaign link.';
COMMENT ON TABLE internal.events IS 'Tracks events (link opens, button clicks) within sessions for campaign analytics.';
COMMENT ON COLUMN internal.sessions.session_flag IS 'Session classification: new_session (default), actual_session (>10s), engaged_session (actual + events)';
COMMENT ON COLUMN internal.sessions.active_time_spent IS 'Cumulative active time in seconds, updated by worker from heartbeat pings';
COMMENT ON COLUMN internal.events.metadata IS 'Event-specific metadata: page_navigation, button_name, external_link for button_click events';

