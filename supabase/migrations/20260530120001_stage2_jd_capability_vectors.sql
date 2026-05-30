-- Stage 2: JD capability vectors and chunking version on job_descriptions
-- source_text stores the original JD requirement text that was decomposed into each vector.

BEGIN;

CREATE TABLE IF NOT EXISTS agents.jd_capability_vectors (
    id BIGSERIAL PRIMARY KEY,
    jd_id UUID NOT NULL REFERENCES agents.job_descriptions(id) ON DELETE CASCADE,
    keyword_group TEXT NOT NULL CHECK (
        keyword_group IN ('must_have', 'industry', 'metric', 'generic')
    ),
    text TEXT NOT NULL,
    source_text TEXT,
    content_hash TEXT NOT NULL,
    embedding vector(1536),
    is_active BOOLEAN NOT NULL DEFAULT true,
    reused_from_vector_id BIGINT REFERENCES agents.jd_capability_vectors(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jd_capability_vectors_jd_id
    ON agents.jd_capability_vectors(jd_id);

CREATE INDEX IF NOT EXISTS idx_jd_capability_vectors_content_hash
    ON agents.jd_capability_vectors(content_hash);

CREATE INDEX IF NOT EXISTS idx_jd_capability_vectors_jd_group
    ON agents.jd_capability_vectors(jd_id, keyword_group)
    WHERE is_active = true;

ALTER TABLE agents.job_descriptions
    ADD COLUMN IF NOT EXISTS chunking_version INTEGER NOT NULL DEFAULT 1;

-- Security hardening: agents schema tables are not exposed to anon/authenticated/public.
REVOKE ALL ON TABLE agents.jd_capability_vectors FROM PUBLIC;
REVOKE ALL ON TABLE agents.jd_capability_vectors FROM anon;
REVOKE ALL ON TABLE agents.jd_capability_vectors FROM authenticated;

GRANT ALL ON TABLE agents.jd_capability_vectors TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agents.jd_capability_vectors TO service_role;

REVOKE ALL ON SEQUENCE agents.jd_capability_vectors_id_seq FROM PUBLIC;
REVOKE ALL ON SEQUENCE agents.jd_capability_vectors_id_seq FROM anon;
REVOKE ALL ON SEQUENCE agents.jd_capability_vectors_id_seq FROM authenticated;

GRANT ALL ON SEQUENCE agents.jd_capability_vectors_id_seq TO postgres;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE agents.jd_capability_vectors_id_seq TO service_role;

COMMIT;
