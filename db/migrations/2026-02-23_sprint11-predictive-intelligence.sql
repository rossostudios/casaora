-- Sprint 11: Predictive Intelligence
-- ML predictions tracking, demand forecasts, enhanced tenant screening.

-- ═══════════════════════════════════════════════════════════════════════
-- 1. ML Predictions — prediction tracking with outcome feedback
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ml_predictions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  prediction_type   text NOT NULL
                      CHECK (prediction_type IN ('tenant_risk', 'demand', 'maintenance',
                                                   'churn', 'pricing', 'anomaly')),
  entity_type       text,
  entity_id         uuid,
  predicted_value   double precision,
  predicted_label   text,
  confidence        double precision DEFAULT 0,
  features          jsonb DEFAULT '{}',
  actual_outcome    text,
  outcome_value     double precision,
  outcome_recorded_at timestamptz,
  model_version     text DEFAULT 'v1',
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ml_predictions_org_type
  ON ml_predictions(organization_id, prediction_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_entity
  ON ml_predictions(entity_id) WHERE entity_id IS NOT NULL;

ALTER TABLE ml_predictions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ml_predictions'
      AND policyname = 'ml_predictions_org_member_all'
  ) THEN
    CREATE POLICY ml_predictions_org_member_all
      ON ml_predictions FOR ALL
      USING (is_org_member(organization_id))
      WITH CHECK (is_org_member(organization_id));
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- 2. Demand Forecasts — 90-day occupancy/rate forecasts
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS demand_forecasts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  unit_id           uuid REFERENCES units(id) ON DELETE CASCADE,
  property_id       uuid REFERENCES properties(id) ON DELETE CASCADE,
  forecast_date     date NOT NULL,
  predicted_occupancy double precision DEFAULT 0,
  predicted_adr     double precision DEFAULT 0,
  predicted_demand  text DEFAULT 'normal'
                      CHECK (predicted_demand IN ('low', 'normal', 'high', 'peak')),
  confidence        double precision DEFAULT 0,
  factors           jsonb DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_demand_forecasts_org
  ON demand_forecasts(organization_id, forecast_date);
CREATE INDEX IF NOT EXISTS idx_demand_forecasts_unit
  ON demand_forecasts(unit_id, forecast_date)
  WHERE unit_id IS NOT NULL;

ALTER TABLE demand_forecasts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'demand_forecasts'
      AND policyname = 'demand_forecasts_org_member_all'
  ) THEN
    CREATE POLICY demand_forecasts_org_member_all
      ON demand_forecasts FOR ALL
      USING (is_org_member(organization_id))
      WITH CHECK (is_org_member(organization_id));
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- 3. Extend applications — predictive score and risk factors
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS predictive_score   double precision,
  ADD COLUMN IF NOT EXISTS risk_factors       jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ml_screened_at     timestamptz;
