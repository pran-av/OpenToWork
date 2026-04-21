-- Initial agents schema and core tables
-- FKs reference auth.users; native Postgres partitioning for episodic tables.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE SCHEMA IF NOT EXISTS agents;

-- Enum types for JD classification and scoring buckets
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_archetype') THEN
        CREATE TYPE agents.role_archetype AS ENUM (
            'execution_heavy',
            'strategy_heavy',
            'technical_depth_heavy',
            'growth_heavy',
            'compliance_heavy',
            'cannot_be_determined'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'seniority_level') THEN
        CREATE TYPE agents.seniority_level AS ENUM (
            'execution',
            'ownership',
            'portfolio',
            'cannot_be_determined'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'company_context_type') THEN
        CREATE TYPE agents.company_context_type AS ENUM (
            'startup',
            'scale_up',
            'enterprise',
            'cannot_be_determined'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'score_bucket') THEN
        CREATE TYPE agents.score_bucket AS ENUM (
            'excellent',
            'good',
            'fair',
            'weak',
            'low'
        );
    END IF;
END$$;

-- Tasks: procedural memory for client-initiated work
CREATE TABLE IF NOT EXISTS agents.tasks (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users (id),
    task_type TEXT NOT NULL,
    status TEXT NOT NULL,
    priority INTEGER,
    request_payload JSONB,
    response_payload JSONB,
    error_code TEXT,
    error_message TEXT,
    pubsub_message_id TEXT,
    worker_instance_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    queued_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON agents.tasks (user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status_created_at ON agents.tasks (status, created_at DESC);

-- Task events: episodic, partitioned by time
CREATE TABLE IF NOT EXISTS agents.task_events (
    id BIGSERIAL,
    task_id UUID NOT NULL REFERENCES agents.tasks (id) ON DELETE CASCADE,
    ts TIMESTAMPTZ NOT NULL,
    event_type TEXT NOT NULL,
    event_data JSONB,
    PRIMARY KEY (id, ts)
) PARTITION BY RANGE (ts);

CREATE TABLE IF NOT EXISTS agents.task_events_2026_q1
    PARTITION OF agents.task_events
    FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');

CREATE INDEX IF NOT EXISTS idx_task_events_task_id_ts ON agents.task_events (task_id, ts);

-- User profiles: current snapshot and version history
CREATE TABLE IF NOT EXISTS agents.user_profiles (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users (id),
    user_type TEXT NOT NULL,
    current_version INTEGER NOT NULL DEFAULT 1,
    experience_summary TEXT,
    goals_summary TEXT,
    references_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON agents.user_profiles (user_id);

CREATE TABLE IF NOT EXISTS agents.user_profile_versions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users (id),
    version INTEGER NOT NULL,
    user_type TEXT NOT NULL,
    experience_raw TEXT,
    goals_raw TEXT,
    references_json JSONB,
    derived_profile_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, version)
);

-- Resumes: file_hash (content_sha256) + text_hash (text_sha256) for idempotency
CREATE TABLE IF NOT EXISTS agents.resumes (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users (id),
    profile_version_id UUID REFERENCES agents.user_profile_versions (id),
    resume_name TEXT NOT NULL,
    file_name TEXT NOT NULL,
    storage_url TEXT NOT NULL,
    content_sha256 TEXT NOT NULL,
    text_sha256 TEXT,
    language TEXT,
    pages INTEGER,
    is_active_for_context BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, content_sha256)
);

CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON agents.resumes (user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_text_sha256 ON agents.resumes (text_sha256);

CREATE TABLE IF NOT EXISTS agents.resume_chunks (
    id BIGSERIAL PRIMARY KEY,
    resume_id UUID NOT NULL REFERENCES agents.resumes (id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    section TEXT,
    text TEXT NOT NULL,
    embedding VECTOR,
    metadata JSONB,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resume_chunks_resume_id ON agents.resume_chunks (resume_id);

-- Job descriptions: metadata + fingerprint; no long-term full text; applied_outcome when user shares
CREATE TABLE IF NOT EXISTS agents.job_descriptions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users (id),
    source_type TEXT NOT NULL,
    source_url TEXT,
    raw_input_text TEXT,
    normalized_text TEXT,
    jd_fingerprint_hash TEXT NOT NULL,
    company_name TEXT,
    role_title TEXT,
    job_id_external TEXT,
    location TEXT,
    company_description TEXT,
    company_industry TEXT,
    role_archetype agents.role_archetype DEFAULT 'cannot_be_determined',
    seniority agents.seniority_level DEFAULT 'cannot_be_determined',
    company_context agents.company_context_type DEFAULT 'cannot_be_determined',
    must_have_keywords JSONB,
    industry_keywords JSONB,
    metric_keywords JSONB,
    generic_keywords JSONB,
    applied_outcome TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_descriptions_user_id ON agents.job_descriptions (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_descriptions_user_fingerprint
    ON agents.job_descriptions (user_id, jd_fingerprint_hash);

-- Resume–JD scoring runs
CREATE TABLE IF NOT EXISTS agents.resume_jd_scores (
    id UUID PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES agents.tasks (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users (id),
    resume_id UUID NOT NULL REFERENCES agents.resumes (id),
    jd_id UUID NOT NULL REFERENCES agents.job_descriptions (id),
    dimensional_score_raw NUMERIC,
    dimensional_score_weighted NUMERIC,
    keyword_score NUMERIC,
    final_score NUMERIC,
    score_bucket agents.score_bucket,
    dimensional_breakdown JSONB,
    keyword_breakdown JSONB,
    flags JSONB,
    report_pdf_url TEXT,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resume_jd_scores_user_id ON agents.resume_jd_scores (user_id);
CREATE INDEX IF NOT EXISTS idx_resume_jd_scores_task_id ON agents.resume_jd_scores (task_id);

-- Token usage: per step
CREATE TABLE IF NOT EXISTS agents.token_usage (
    id BIGSERIAL PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES agents.tasks (id) ON DELETE CASCADE,
    step_id TEXT,
    model_name TEXT NOT NULL,
    input_tokens BIGINT NOT NULL DEFAULT 0,
    output_tokens BIGINT NOT NULL DEFAULT 0,
    cache_read_tokens BIGINT DEFAULT 0,
    cache_write_tokens BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_usage_task_id ON agents.token_usage (task_id);

-- Agent conversations and messages: episodic, partitioned
CREATE TABLE IF NOT EXISTS agents.agent_conversations (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users (id),
    task_id UUID REFERENCES agents.tasks (id) ON DELETE SET NULL,
    flow_type TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_conversations_user_id ON agents.agent_conversations (user_id);

CREATE TABLE IF NOT EXISTS agents.agent_messages (
    id BIGSERIAL,
    conversation_id UUID NOT NULL REFERENCES agents.agent_conversations (id) ON DELETE CASCADE,
    task_id UUID REFERENCES agents.tasks (id) ON DELETE SET NULL,
    ts TIMESTAMPTZ NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB,
    PRIMARY KEY (id, ts)
) PARTITION BY RANGE (ts);

CREATE TABLE IF NOT EXISTS agents.agent_messages_2026_q1
    PARTITION OF agents.agent_messages
    FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');

CREATE INDEX IF NOT EXISTS idx_agent_messages_conversation_id_ts
    ON agents.agent_messages (conversation_id, ts);

-- Semantic memory (vector store)
CREATE TABLE IF NOT EXISTS agents.semantic_memory (
    id BIGSERIAL PRIMARY KEY,
    owner_type TEXT NOT NULL,
    owner_id UUID,
    namespace TEXT NOT NULL,
    text TEXT NOT NULL,
    embedding VECTOR,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_semantic_memory_owner_namespace
    ON agents.semantic_memory (owner_type, owner_id, namespace);

-- Notifications: task-level, queryable via API
CREATE TABLE IF NOT EXISTS agents.notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users (id),
    task_id UUID REFERENCES agents.tasks (id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    payload JSONB,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at
    ON agents.notifications (user_id, created_at DESC);

-- Revoke all permissions on the agents schema from public, anon, and authenticated users
REVOKE ALL ON SCHEMA agents FROM public;
REVOKE ALL ON SCHEMA agents FROM anon;
REVOKE ALL ON SCHEMA agents FROM authenticated;

-- Revoke all permissions on all tables in the agents schema from public, anon, and authenticated users
REVOKE ALL ON ALL TABLES IN SCHEMA agents FROM public;
REVOKE ALL ON ALL TABLES IN SCHEMA agents FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA agents FROM authenticated;

-- Grant usage on the agents schema to the service_role
GRANT USAGE ON SCHEMA agents TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA agents
REVOKE ALL ON TABLES FROM public, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA agents
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;

-- Grant usage on all sequences in the agents schema to the service_role
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA agents TO service_role;

-- Grant usage on all functions in the agents schema to the service_role
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA agents TO service_role;

