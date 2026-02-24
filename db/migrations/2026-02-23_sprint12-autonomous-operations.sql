-- Sprint 12: Autonomous Operations & Platform Polish
-- Agent supervisor coordination, evaluation scoring, self-healing, playbook builder, cost tracking.

-- ═══════════════════════════════════════════════════════════════════════
-- 1. Extend agent_evaluations — quality scoring + cost tracking
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE agent_evaluations
  ADD COLUMN IF NOT EXISTS accuracy_score     double precision,
  ADD COLUMN IF NOT EXISTS helpfulness_score  double precision,
  ADD COLUMN IF NOT EXISTS safety_score       double precision,
  ADD COLUMN IF NOT EXISTS latency_ms         integer,
  ADD COLUMN IF NOT EXISTS cost_estimate      double precision DEFAULT 0,
  ADD COLUMN IF NOT EXISTS model_used         text,
  ADD COLUMN IF NOT EXISTS error_count        integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retry_count        integer DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_agent_evaluations_org_slug
  ON agent_evaluations(organization_id, agent_slug, created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════
-- 2. Agent Playbooks — no-code automation builder
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS agent_playbooks (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              text NOT NULL,
  description       text,
  trigger_type      text NOT NULL DEFAULT 'manual'
                      CHECK (trigger_type IN ('manual', 'schedule', 'event', 'threshold')),
  trigger_conditions jsonb DEFAULT '{}',
  steps             jsonb DEFAULT '[]',
  agent_slug        text NOT NULL DEFAULT 'guest-concierge',
  is_active         boolean NOT NULL DEFAULT true,
  last_run_at       timestamptz,
  run_count         integer DEFAULT 0,
  avg_duration_ms   integer,
  created_by        uuid REFERENCES app_users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_playbooks_org
  ON agent_playbooks(organization_id, is_active, trigger_type);

ALTER TABLE agent_playbooks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agent_playbooks'
      AND policyname = 'agent_playbooks_org_member_all'
  ) THEN
    CREATE POLICY agent_playbooks_org_member_all
      ON agent_playbooks FOR ALL
      USING (is_org_member(organization_id))
      WITH CHECK (is_org_member(organization_id));
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- 3. Agent Health Metrics — daily per-agent performance aggregates
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS agent_health_metrics (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_slug        text NOT NULL,
  metric_date       date NOT NULL,
  total_chats       integer DEFAULT 0,
  total_tool_calls  integer DEFAULT 0,
  avg_latency_ms    integer,
  p95_latency_ms    integer,
  error_rate        double precision DEFAULT 0,
  avg_accuracy      double precision,
  avg_helpfulness   double precision,
  avg_safety        double precision,
  total_tokens      integer DEFAULT 0,
  total_cost        double precision DEFAULT 0,
  escalation_count  integer DEFAULT 0,
  approval_count    integer DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, agent_slug, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_agent_health_metrics_org
  ON agent_health_metrics(organization_id, metric_date DESC);

ALTER TABLE agent_health_metrics ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agent_health_metrics'
      AND policyname = 'agent_health_metrics_org_member_all'
  ) THEN
    CREATE POLICY agent_health_metrics_org_member_all
      ON agent_health_metrics FOR ALL
      USING (is_org_member(organization_id))
      WITH CHECK (is_org_member(organization_id));
  END IF;
END $$;
