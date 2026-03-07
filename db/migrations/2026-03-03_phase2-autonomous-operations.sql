-- Phase 2: Autonomous Operations
-- Adds: agent event bus, agent watchers, workflow chains,
--        ML prediction reactor trigger, ML pipeline tables.

-- ═══════════════════════════════════════════════════════════════════════
-- 1. Agent Event Bus — async inter-agent communication
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS agent_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_agent      text NOT NULL,
  target_agent      text,
  event_type        text NOT NULL,
  payload           jsonb NOT NULL DEFAULT '{}'::jsonb,
  priority          text NOT NULL DEFAULT 'medium'
                      CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status            text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'processing', 'delivered', 'failed', 'expired')),
  processed_at      timestamptz,
  expires_at        timestamptz DEFAULT now() + interval '24 hours',
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_events_pending
  ON agent_events(organization_id, status, priority DESC, created_at ASC)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_agent_events_target
  ON agent_events(target_agent, status)
  WHERE target_agent IS NOT NULL AND status = 'pending';

ALTER TABLE agent_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agent_events'
      AND policyname = 'agent_events_org_member_all'
  ) THEN
    CREATE POLICY agent_events_org_member_all
      ON agent_events FOR ALL
      USING (is_org_member(organization_id))
      WITH CHECK (is_org_member(organization_id));
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- 2. Agent Watchers — persistent background rules
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS agent_watchers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              text NOT NULL,
  watch_table       text NOT NULL,
  watch_filter      jsonb NOT NULL DEFAULT '{}'::jsonb,
  agent_slug        text NOT NULL,
  message_template  text NOT NULL DEFAULT 'New {{watch_table}} detected. Please review.',
  is_active         boolean NOT NULL DEFAULT true,
  last_seen_id      uuid,
  last_checked_at   timestamptz DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_watchers_active
  ON agent_watchers(organization_id, is_active, watch_table)
  WHERE is_active = true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_agent_watchers_updated_at'
  ) THEN
    CREATE TRIGGER trg_agent_watchers_updated_at
      BEFORE UPDATE ON agent_watchers
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

ALTER TABLE agent_watchers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agent_watchers'
      AND policyname = 'agent_watchers_org_member_all'
  ) THEN
    CREATE POLICY agent_watchers_org_member_all
      ON agent_watchers FOR ALL
      USING (is_org_member(organization_id))
      WITH CHECK (is_org_member(organization_id));
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- 3. Workflow chain action type
-- ═══════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  BEGIN ALTER TYPE workflow_action_type ADD VALUE IF NOT EXISTS 'chain'; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

DO $$
BEGIN
  BEGIN ALTER TYPE workflow_trigger_event ADD VALUE IF NOT EXISTS 'ml_prediction_actionable'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE workflow_trigger_event ADD VALUE IF NOT EXISTS 'chain_step_completed'; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- 4. ML Pipeline Tables (referenced by ml_pipeline.rs)
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ml_features (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  feature_set       text NOT NULL,
  entity_id         uuid,
  features          jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at       timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, feature_set, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_ml_features_org_set
  ON ml_features(organization_id, feature_set);

ALTER TABLE ml_features ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ml_features'
      AND policyname = 'ml_features_org_member_all'
  ) THEN
    CREATE POLICY ml_features_org_member_all
      ON ml_features FOR ALL
      USING (is_org_member(organization_id))
      WITH CHECK (is_org_member(organization_id));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS ml_models (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  model_type        text NOT NULL,
  version           integer NOT NULL DEFAULT 1,
  parameters        jsonb NOT NULL DEFAULT '{}'::jsonb,
  metrics           jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active         boolean NOT NULL DEFAULT true,
  trained_at        timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ml_models_active
  ON ml_models(organization_id, model_type, is_active)
  WHERE is_active = true;

ALTER TABLE ml_models ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ml_models'
      AND policyname = 'ml_models_org_member_all'
  ) THEN
    CREATE POLICY ml_models_org_member_all
      ON ml_models FOR ALL
      USING (is_org_member(organization_id))
      WITH CHECK (is_org_member(organization_id));
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- 5. Seed default watchers for maintenance + reservations
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO agent_watchers (organization_id, name, watch_table, watch_filter, agent_slug, message_template)
SELECT o.id,
       'Auto-triage new maintenance requests',
       'maintenance_requests',
       '{"status": "open", "source": "iot_sensor"}'::jsonb,
       'maintenance-triage',
       'New maintenance request submitted: {{title}}. Please classify urgency and assign.'
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM agent_watchers aw
  WHERE aw.organization_id = o.id
    AND aw.watch_table = 'maintenance_requests'
)
ON CONFLICT DO NOTHING;
