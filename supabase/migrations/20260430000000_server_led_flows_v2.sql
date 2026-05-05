-- Server-led flows v2 migration.
-- Adds generalized flow-state tables and deprecates legacy onboarding-only state writes.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS agents.flow_instances (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    flow_type TEXT NOT NULL,
    flow_key TEXT NOT NULL,
    state TEXT NOT NULL,
    conversation_id UUID NULL REFERENCES agents.agent_conversations(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ NULL,
    metadata JSONB NULL
);

CREATE TABLE IF NOT EXISTS agents.step_instances (
    id BIGSERIAL PRIMARY KEY,
    flow_instance_id UUID NOT NULL REFERENCES agents.flow_instances(id) ON DELETE CASCADE,
    step_key TEXT NOT NULL,
    actor_type TEXT NOT NULL,
    state TEXT NOT NULL,
    is_skippable BOOLEAN NOT NULL DEFAULT true,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ NULL,
    skipped_at TIMESTAMPTZ NULL,
    metadata JSONB NULL
);

CREATE TABLE IF NOT EXISTS agents.ui_action_instances (
    id BIGSERIAL PRIMARY KEY,
    flow_instance_id UUID NOT NULL REFERENCES agents.flow_instances(id) ON DELETE CASCADE,
    step_instance_id BIGINT NOT NULL REFERENCES agents.step_instances(id) ON DELETE CASCADE,
    parent_action_id BIGINT NULL REFERENCES agents.ui_action_instances(id) ON DELETE CASCADE,
    target TEXT NOT NULL,
    tooltip TEXT NOT NULL,
    message TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'STEP_ISSUED',
    is_skippable BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ NULL,
    skipped_at TIMESTAMPTZ NULL,
    metadata JSONB NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS flow_instances_active_user_type_idx
ON agents.flow_instances(user_id, flow_type)
WHERE state = 'FLOW_ACTIVE';

CREATE UNIQUE INDEX IF NOT EXISTS step_instances_flow_step_key_idx
ON agents.step_instances(flow_instance_id, step_key);

CREATE UNIQUE INDEX IF NOT EXISTS ui_action_instances_step_target_idx
ON agents.ui_action_instances(step_instance_id, target);

-- Deprecate legacy onboarding-only action status writes.
-- Keep SELECT access for audit/history; route new writes to v2 tables.
REVOKE INSERT, UPDATE, DELETE ON TABLE agents.onboarding_ui_action_status FROM service_role;
GRANT SELECT ON TABLE agents.onboarding_ui_action_status TO service_role;

-- Security hardening for new v2 tables.
REVOKE ALL ON TABLE agents.flow_instances FROM PUBLIC;
REVOKE ALL ON TABLE agents.flow_instances FROM anon;
REVOKE ALL ON TABLE agents.flow_instances FROM authenticated;

REVOKE ALL ON TABLE agents.step_instances FROM PUBLIC;
REVOKE ALL ON TABLE agents.step_instances FROM anon;
REVOKE ALL ON TABLE agents.step_instances FROM authenticated;

REVOKE ALL ON TABLE agents.ui_action_instances FROM PUBLIC;
REVOKE ALL ON TABLE agents.ui_action_instances FROM anon;
REVOKE ALL ON TABLE agents.ui_action_instances FROM authenticated;

GRANT ALL ON TABLE agents.flow_instances TO postgres;
GRANT ALL ON TABLE agents.step_instances TO postgres;
GRANT ALL ON TABLE agents.ui_action_instances TO postgres;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agents.flow_instances TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agents.step_instances TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agents.ui_action_instances TO service_role;

-- Security hardening for sequences created by BIGSERIAL.
REVOKE ALL ON SEQUENCE agents.step_instances_id_seq FROM PUBLIC;
REVOKE ALL ON SEQUENCE agents.step_instances_id_seq FROM anon;
REVOKE ALL ON SEQUENCE agents.step_instances_id_seq FROM authenticated;

REVOKE ALL ON SEQUENCE agents.ui_action_instances_id_seq FROM PUBLIC;
REVOKE ALL ON SEQUENCE agents.ui_action_instances_id_seq FROM anon;
REVOKE ALL ON SEQUENCE agents.ui_action_instances_id_seq FROM authenticated;

GRANT ALL ON SEQUENCE agents.step_instances_id_seq TO postgres;
GRANT ALL ON SEQUENCE agents.ui_action_instances_id_seq TO postgres;

GRANT USAGE, SELECT, UPDATE ON SEQUENCE agents.step_instances_id_seq TO service_role;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE agents.ui_action_instances_id_seq TO service_role;

COMMIT;

