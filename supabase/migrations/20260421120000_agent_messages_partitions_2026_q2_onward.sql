-- agent_messages is PARTITION BY RANGE (ts).
--
-- Here we use calendar quarters only to match the existing Q1 naming and keep
-- ranges contiguous and easy to reason about. Alternatives: monthly partitions,
-- a single yearly partition, or a DEFAULT partition (PG11+) to catch overflow.
--

-- 2026 Q2–Q4 (Apr–Dec)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'agents' AND c.relname = 'agent_messages_2026_q2'
  ) THEN
    CREATE TABLE agents.agent_messages_2026_q2
      PARTITION OF agents.agent_messages
      FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'agents' AND c.relname = 'agent_messages_2026_q3'
  ) THEN
    CREATE TABLE agents.agent_messages_2026_q3
      PARTITION OF agents.agent_messages
      FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'agents' AND c.relname = 'agent_messages_2026_q4'
  ) THEN
    CREATE TABLE agents.agent_messages_2026_q4
      PARTITION OF agents.agent_messages
      FOR VALUES FROM ('2026-10-01') TO ('2027-01-01');
  END IF;
END$$;
