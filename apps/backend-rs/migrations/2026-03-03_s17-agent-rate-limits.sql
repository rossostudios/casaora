-- S17: DB-backed rate limiting + approval expansion
-- Replaces in-memory Mutex<HashMap> rate limiter with PostgreSQL-backed atomic counters.

-- Configurable rate limit per org/agent
CREATE TABLE IF NOT EXISTS agent_rate_limit_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    agent_slug text NOT NULL DEFAULT '*',
    max_calls_per_hour integer NOT NULL DEFAULT 100,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (organization_id, agent_slug)
);

ALTER TABLE agent_rate_limit_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_isolation ON agent_rate_limit_config
    USING (organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    ));

-- Atomic call counter per org/agent/hour bucket
CREATE TABLE IF NOT EXISTS agent_rate_limits (
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    agent_slug text NOT NULL,
    hour_bucket bigint NOT NULL,
    call_count integer NOT NULL DEFAULT 1,
    PRIMARY KEY (organization_id, agent_slug, hour_bucket)
);

ALTER TABLE agent_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_isolation ON agent_rate_limits
    USING (organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    ));

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_agent_rate_limits_bucket ON agent_rate_limits (hour_bucket);
