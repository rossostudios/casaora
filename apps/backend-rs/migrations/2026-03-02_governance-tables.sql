-- S15.4: Governance Center tables

-- PII intercept log
CREATE TABLE IF NOT EXISTS pii_intercept_log (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    agent_slug    text NOT NULL DEFAULT 'unknown',
    pii_type      text NOT NULL DEFAULT 'unknown',
    action_taken  text NOT NULL DEFAULT 'blocked',
    context       jsonb DEFAULT '{}',
    detected_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pii_intercept_org
    ON pii_intercept_log(organization_id, detected_at DESC);

ALTER TABLE pii_intercept_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pii_intercept_log_org ON pii_intercept_log;
CREATE POLICY pii_intercept_log_org ON pii_intercept_log
    USING (is_org_member(organization_id));

-- Agent boundary rules
CREATE TABLE IF NOT EXISTS agent_boundary_rules (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    category      text NOT NULL,
    is_blocked    boolean NOT NULL DEFAULT false,
    custom_response text,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (organization_id, category)
);

CREATE INDEX IF NOT EXISTS idx_boundary_rules_org
    ON agent_boundary_rules(organization_id);

ALTER TABLE agent_boundary_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS agent_boundary_rules_org ON agent_boundary_rules;
CREATE POLICY agent_boundary_rules_org ON agent_boundary_rules
    USING (is_org_member(organization_id));

-- Seed default boundary rules for each org
INSERT INTO agent_boundary_rules (organization_id, category, is_blocked)
SELECT o.id, c.category, false
FROM organizations o
CROSS JOIN (
    VALUES ('financial_advice'), ('legal_interpretation'), ('medical_guidance'),
           ('personal_data_sharing'), ('contract_signing'), ('payment_authorization')
) AS c(category)
ON CONFLICT (organization_id, category) DO NOTHING;
