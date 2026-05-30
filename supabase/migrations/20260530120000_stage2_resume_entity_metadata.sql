-- Stage 2: Resume entity metadata (PII separated from embeddable chunks)
-- One row per entity instance (contact_header, experience_role, education_program, skills_group).
-- Apply in order on agents schema.

BEGIN;

CREATE TABLE IF NOT EXISTS agents.resume_entity_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_id UUID NOT NULL REFERENCES agents.resumes(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (
        entity_type IN ('contact_header', 'experience_role', 'education_program', 'skills_group')
    ),
    -- contact_header fields (populated only when entity_type = contact_header)
    full_name TEXT,
    email TEXT,
    phone TEXT,
    linkedin_url TEXT,
    website_url TEXT,
    portfolio_url TEXT,
    -- experience_role fields (populated only when entity_type = experience_role)
    role_title TEXT,
    company_name TEXT,
    location TEXT,
    start_month TEXT,
    start_year INTEGER,
    end_month TEXT,
    end_year INTEGER,
    is_current BOOLEAN,
    months_in_role INTEGER,
    experience_tag TEXT,
    -- education_program fields (populated only when entity_type = education_program)
    institution TEXT,
    program TEXT,
    edu_start_month TEXT,
    edu_start_year INTEGER,
    edu_end_month TEXT,
    edu_end_year INTEGER,
    edu_is_current BOOLEAN,
    -- All columns above are nullable except id/resume_id/entity_type/created_at.
    -- Only the subset matching entity_type is populated per row.
    -- skills_group fields (populated only when entity_type = skills_group)
    skills_json JSONB,
    extra_json JSONB,
    reused_from_chunk_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resume_entity_metadata_resume_id
    ON agents.resume_entity_metadata(resume_id);

CREATE INDEX IF NOT EXISTS idx_resume_entity_metadata_entity_type
    ON agents.resume_entity_metadata(resume_id, entity_type);

-- Extend resume_chunks for Stage 2 hierarchy and dedup
ALTER TABLE agents.resume_chunks
    ADD COLUMN IF NOT EXISTS content_hash TEXT,
    ADD COLUMN IF NOT EXISTS parent_chunk_id BIGINT REFERENCES agents.resume_chunks(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS entity_metadata_id UUID REFERENCES agents.resume_entity_metadata(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS chunk_kind TEXT,
    ADD COLUMN IF NOT EXISTS chunking_version INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS reused_from_chunk_id BIGINT REFERENCES agents.resume_chunks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_resume_chunks_content_hash
    ON agents.resume_chunks(content_hash)
    WHERE content_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_resume_chunks_parent_chunk_id
    ON agents.resume_chunks(parent_chunk_id)
    WHERE parent_chunk_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_resume_chunks_entity_metadata_id
    ON agents.resume_chunks(entity_metadata_id)
    WHERE entity_metadata_id IS NOT NULL;

-- Resume-level Stage 2 flags
ALTER TABLE agents.resumes
    ADD COLUMN IF NOT EXISTS unstructured_input BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS chunking_version INTEGER NOT NULL DEFAULT 1;

-- Security hardening: agents schema tables are not exposed to anon/authenticated/public.
REVOKE ALL ON TABLE agents.resume_entity_metadata FROM PUBLIC;
REVOKE ALL ON TABLE agents.resume_entity_metadata FROM anon;
REVOKE ALL ON TABLE agents.resume_entity_metadata FROM authenticated;

GRANT ALL ON TABLE agents.resume_entity_metadata TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agents.resume_entity_metadata TO service_role;

COMMIT;
