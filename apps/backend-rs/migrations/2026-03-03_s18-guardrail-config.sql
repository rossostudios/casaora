-- S18: Configurable guardrails — replaces hardcoded thresholds with DB-backed config.

CREATE TABLE IF NOT EXISTS agent_guardrail_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    guardrail_key text NOT NULL,
    value_json jsonb NOT NULL DEFAULT '{}',
    description text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (organization_id, guardrail_key)
);

ALTER TABLE agent_guardrail_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_isolation ON agent_guardrail_config
    USING (organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    ));

CREATE INDEX IF NOT EXISTS idx_guardrail_config_org_key
    ON agent_guardrail_config (organization_id, guardrail_key);
