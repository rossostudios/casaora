-- Phase 4 migration: contract_templates + owner access tokens

-- ===== Contract Templates =====
CREATE TABLE IF NOT EXISTS contract_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    language text NOT NULL DEFAULT 'es',
    body_template text NOT NULL DEFAULT '',
    variables jsonb NOT NULL DEFAULT '[]'::jsonb,
    is_default boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contract_templates_org
    ON contract_templates(organization_id);

-- ===== Owner Access Tokens (mirror tenant_access_tokens) =====
CREATE TABLE IF NOT EXISTS owner_access_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_email text NOT NULL,
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    token_hash text NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
    last_used_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_owner_access_tokens_hash
    ON owner_access_tokens(token_hash);
