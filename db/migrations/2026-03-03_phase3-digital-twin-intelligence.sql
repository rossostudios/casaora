-- Phase 3: Digital Twin & Intelligence
-- Adds: property digital twin state, deliberation_requested trigger,
--        portfolio-manager agent seed.

-- ═══════════════════════════════════════════════════════════════════════
-- 1. Property State (Digital Twin)
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS property_state (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES organizations(id),
  property_id           uuid NOT NULL REFERENCES properties(id),
  health_score          numeric(5,2) DEFAULT 0,
  occupancy_rate        numeric(5,2) DEFAULT 0,
  avg_daily_rate        numeric(12,2) DEFAULT 0,
  revenue_mtd           numeric(14,2) DEFAULT 0,
  pending_maintenance   integer DEFAULT 0,
  avg_review_score      numeric(3,2) DEFAULT 0,
  guest_sentiment_score numeric(5,2) DEFAULT 0,
  risk_flags            jsonb DEFAULT '[]',
  state_snapshot        jsonb DEFAULT '{}',
  refreshed_at          timestamptz DEFAULT now(),
  created_at            timestamptz DEFAULT now(),
  UNIQUE(organization_id, property_id)
);

ALTER TABLE property_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY property_state_org ON property_state
  USING (is_org_member(organization_id));

CREATE INDEX idx_property_state_org ON property_state(organization_id);

-- ═══════════════════════════════════════════════════════════════════════
-- 2. Add deliberation_requested to workflow trigger events
-- ═══════════════════════════════════════════════════════════════════════

ALTER TYPE workflow_trigger_event ADD VALUE IF NOT EXISTS 'deliberation_requested';

-- ═══════════════════════════════════════════════════════════════════════
-- 3. Portfolio Strategy Agent seed
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO ai_agents (slug, name, description, is_active)
VALUES (
  'portfolio-manager',
  'Portfolio Strategy Agent',
  'Portfolio-level reasoning, cross-property optimization, and investment strategy.',
  true
)
ON CONFLICT (slug) DO NOTHING;
