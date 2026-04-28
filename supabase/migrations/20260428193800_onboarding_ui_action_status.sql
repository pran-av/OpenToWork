-- Create onboarding UI action completion tracking table.
-- Timestamp: 2026-04-28 19:38

CREATE TABLE IF NOT EXISTS agents.onboarding_ui_action_status (
    id BIGSERIAL PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES agents.agent_conversations(id) ON DELETE CASCADE,
    target TEXT NOT NULL,
    step_id TEXT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ NULL,
    metadata JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT onboarding_ui_action_status_conversation_target_key UNIQUE (conversation_id, target)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_ui_action_status_conversation_id
ON agents.onboarding_ui_action_status (conversation_id);

-- Security hardening: deny broad access and allow only privileged service roles.
REVOKE ALL ON TABLE agents.onboarding_ui_action_status FROM PUBLIC;
REVOKE ALL ON TABLE agents.onboarding_ui_action_status FROM anon;
REVOKE ALL ON TABLE agents.onboarding_ui_action_status FROM authenticated;

GRANT ALL ON TABLE agents.onboarding_ui_action_status TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agents.onboarding_ui_action_status TO service_role;

REVOKE ALL ON SEQUENCE agents.onboarding_ui_action_status_id_seq FROM PUBLIC;
REVOKE ALL ON SEQUENCE agents.onboarding_ui_action_status_id_seq FROM anon;
REVOKE ALL ON SEQUENCE agents.onboarding_ui_action_status_id_seq FROM authenticated;

GRANT ALL ON SEQUENCE agents.onboarding_ui_action_status_id_seq TO postgres;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE agents.onboarding_ui_action_status_id_seq TO service_role;

-- Add structured JSONB columns for profile summaries (alongside existing text columns).
ALTER TABLE agents.user_profiles
    ADD COLUMN IF NOT EXISTS experience_summary_json JSONB NULL,
    ADD COLUMN IF NOT EXISTS goals_summary_json JSONB NULL;

