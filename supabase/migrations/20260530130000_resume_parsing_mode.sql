-- Track how a resume was parsed: deterministic hybrid vs LLM fallback.

BEGIN;

ALTER TABLE agents.resumes
    ADD COLUMN IF NOT EXISTS parsing_mode TEXT;

COMMENT ON COLUMN agents.resumes.parsing_mode IS
    'Resume parse path: deterministic_hybrid | deterministic_only | llm_fallback';

COMMIT;
