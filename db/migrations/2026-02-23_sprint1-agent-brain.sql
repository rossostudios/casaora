-- Sprint 1: Agent Brain Upgrade
-- Adds execution plans, escalation thresholds, and enhanced agent memory.

-- ═══════════════════════════════════════════════════════════════════════
-- 1. Agent Execution Plans — tracks multi-step plans per chat
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS agent_execution_plans (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  chat_id         uuid REFERENCES ai_chats(id) ON DELETE SET NULL,
  agent_slug      text NOT NULL,
  goal            text NOT NULL,
  steps           jsonb NOT NULL DEFAULT '[]',
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
  current_step    integer NOT NULL DEFAULT 0,
  context         jsonb DEFAULT '{}',
  error_log       jsonb DEFAULT '[]',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz
);

CREATE INDEX IF NOT EXISTS idx_agent_execution_plans_org
  ON agent_execution_plans(org_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_execution_plans_chat
  ON agent_execution_plans(chat_id)
  WHERE chat_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_agent_execution_plans_updated_at'
  ) THEN
    CREATE TRIGGER trg_agent_execution_plans_updated_at
      BEFORE UPDATE ON agent_execution_plans
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

ALTER TABLE agent_execution_plans ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agent_execution_plans'
      AND policyname = 'agent_execution_plans_org_member_all'
  ) THEN
    CREATE POLICY agent_execution_plans_org_member_all
      ON agent_execution_plans FOR ALL
      USING (is_org_member(org_id))
      WITH CHECK (is_org_member(org_id));
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- 2. Escalation Thresholds — configurable dollar/action escalation rules
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS escalation_thresholds (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_slug      text,
  threshold_type  text NOT NULL
                    CHECK (threshold_type IN ('dollar_amount', 'action_count', 'risk_score', 'custom')),
  threshold_value double precision NOT NULL,
  action          text NOT NULL DEFAULT 'escalate'
                    CHECK (action IN ('escalate', 'block', 'notify', 'require_approval')),
  notify_channel  text DEFAULT 'in_app',
  notify_target   text,
  description     text,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_escalation_thresholds_org
  ON escalation_thresholds(org_id, is_active);
CREATE INDEX IF NOT EXISTS idx_escalation_thresholds_agent
  ON escalation_thresholds(org_id, agent_slug)
  WHERE agent_slug IS NOT NULL AND is_active = true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_escalation_thresholds_updated_at'
  ) THEN
    CREATE TRIGGER trg_escalation_thresholds_updated_at
      BEFORE UPDATE ON escalation_thresholds
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

ALTER TABLE escalation_thresholds ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'escalation_thresholds'
      AND policyname = 'escalation_thresholds_org_member_all'
  ) THEN
    CREATE POLICY escalation_thresholds_org_member_all
      ON escalation_thresholds FOR ALL
      USING (is_org_member(org_id))
      WITH CHECK (is_org_member(org_id));
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- 3. Extend agent_memory with importance scoring and access tracking
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE agent_memory
  ADD COLUMN IF NOT EXISTS importance_score double precision DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS access_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_accessed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_agent_memory_importance
  ON agent_memory(organization_id, importance_score DESC)
  WHERE importance_score > 0;
