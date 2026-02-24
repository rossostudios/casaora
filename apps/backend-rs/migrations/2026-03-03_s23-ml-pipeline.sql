-- S23: ML Pipeline Foundation — model versioning, feature store, outcome tracking.

-- Trained model registry
CREATE TABLE IF NOT EXISTS ml_models (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    model_type text NOT NULL,
    version integer NOT NULL DEFAULT 1,
    parameters jsonb NOT NULL DEFAULT '{}',
    metrics jsonb NOT NULL DEFAULT '{}',
    is_active boolean NOT NULL DEFAULT false,
    trained_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ml_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_isolation ON ml_models
    USING (organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    ));

CREATE INDEX IF NOT EXISTS idx_ml_models_org_type
    ON ml_models (organization_id, model_type, is_active);

-- Feature store
CREATE TABLE IF NOT EXISTS ml_features (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    feature_set text NOT NULL,
    entity_id text NOT NULL,
    features jsonb NOT NULL DEFAULT '{}',
    computed_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (organization_id, feature_set, entity_id)
);

ALTER TABLE ml_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_isolation ON ml_features
    USING (organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    ));

CREATE INDEX IF NOT EXISTS idx_ml_features_org_set
    ON ml_features (organization_id, feature_set, entity_id);

-- Outcome tracking for feedback loop
CREATE TABLE IF NOT EXISTS ml_outcomes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    prediction_id uuid,
    predicted_value double precision,
    actual_value double precision,
    feedback_type text,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ml_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_isolation ON ml_outcomes
    USING (organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    ));

CREATE INDEX IF NOT EXISTS idx_ml_outcomes_org
    ON ml_outcomes (organization_id, created_at DESC);
