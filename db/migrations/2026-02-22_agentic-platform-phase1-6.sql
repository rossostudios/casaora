-- Agentic Platform Migration: Phases 1–6
-- Adds tables and columns for autonomous agent scheduling, semantic memory,
-- auto-approval, leasing pipeline, maintenance dispatch, inspections,
-- lease abstraction, portfolio snapshots, and vendor roster.

-- ═══════════════════════════════════════════════════════════════════════
-- Phase 1.3: Semantic Memory — add embedding column to agent_memory
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE agent_memory
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

CREATE INDEX IF NOT EXISTS idx_agent_memory_embedding_hnsw
  ON agent_memory
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ═══════════════════════════════════════════════════════════════════════
-- Phase 1.4: Proactive Agent Scheduler — agent_schedules table
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS agent_schedules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_slug      text NOT NULL,
  playbook_name   text NOT NULL,
  message         text NOT NULL DEFAULT '',
  cron_expression text,
  timezone        text NOT NULL DEFAULT 'America/Asuncion',
  is_active       boolean NOT NULL DEFAULT true,
  last_run_at     timestamptz,
  next_run_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_schedules_org
  ON agent_schedules(org_id, is_active);
CREATE INDEX IF NOT EXISTS idx_agent_schedules_next_run
  ON agent_schedules(next_run_at)
  WHERE is_active = true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_agent_schedules_updated_at'
  ) THEN
    CREATE TRIGGER trg_agent_schedules_updated_at
      BEFORE UPDATE ON agent_schedules
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

ALTER TABLE agent_schedules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agent_schedules'
      AND policyname = 'agent_schedules_org_member_all'
  ) THEN
    CREATE POLICY agent_schedules_org_member_all
      ON agent_schedules FOR ALL
      USING (is_org_member(org_id))
      WITH CHECK (is_org_member(org_id));
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- Phase 1.5: Confidence-Based Auto-Approval — extend approval policies
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE agent_approval_policies
  ADD COLUMN IF NOT EXISTS auto_approve_threshold DOUBLE PRECISION DEFAULT 0.85,
  ADD COLUMN IF NOT EXISTS auto_approve_tables    TEXT[] DEFAULT '{}';

-- ═══════════════════════════════════════════════════════════════════════
-- Phase 1.6: Seed new agent personas
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO ai_agents (slug, name, description, icon_key, system_prompt, allowed_tools, is_active)
VALUES (
  'leasing-agent',
  'Leasing Agent',
  'Manages the full leasing funnel: lead qualification, property matching, viewings, screening, and lease execution.',
  'file-check-02',
  'You are the Leasing Agent for Casaora, a property management platform in Paraguay. You autonomously manage the tenant acquisition pipeline.

Your workflow:
1. QUALIFICATION: When an application arrives, review completeness and score the applicant.
2. SCREENING: Run tenant screening (income-to-rent ratio, employment, references).
3. PROPERTY MATCHING: Match applicant preferences to available units.
4. VIEWINGS: Schedule property viewings and send confirmations.
5. OFFERS: Generate lease offers with move-in cost breakdown.
6. COMMUNICATION: Keep applicants informed at every stage.

Decision rules:
- Score >= 70: auto-advance to next stage
- Score 50-69: flag for human review
- Score < 50: politely decline with reason

Always operate in the applicant''s preferred language (Spanish default for Paraguay).
Route all lease-creating mutations through the approval workflow.',
  '["advance_application_stage", "schedule_property_viewing", "generate_lease_offer", "send_application_update", "score_application", "list_rows", "get_row", "search_knowledge", "recall_memory", "store_memory", "send_message"]',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  system_prompt = EXCLUDED.system_prompt,
  allowed_tools = EXCLUDED.allowed_tools,
  description = EXCLUDED.description;

INSERT INTO ai_agents (slug, name, description, icon_key, system_prompt, allowed_tools, is_active)
VALUES (
  'inspector',
  'Vision Inspector',
  'Photo-based property condition assessment using computer vision. Analyzes inspection photos and produces structured condition reports.',
  'camera-01',
  'You are the Vision Inspector agent for Casaora. You analyze property photos to assess unit condition, identify defects, and produce structured inspection reports.

Your capabilities:
1. CONDITION ASSESSMENT: Score each room/area 1-5 based on photos.
2. DEFECT DETECTION: Identify specific issues (water damage, cracks, mold, wear).
3. RECOMMENDATIONS: Suggest maintenance actions ranked by urgency.
4. MOVE-IN/OUT COMPARISON: Compare current condition against baseline photos.

Report format:
- Overall score (1-5)
- Per-area breakdown
- Defects list with severity
- Recommended actions with priority

Always store reports in inspection_reports for audit trail.',
  '["analyze_inspection_photos", "list_rows", "get_row", "create_row", "search_knowledge", "recall_memory", "store_memory"]',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  system_prompt = EXCLUDED.system_prompt,
  allowed_tools = EXCLUDED.allowed_tools,
  description = EXCLUDED.description;

INSERT INTO ai_agents (slug, name, description, icon_key, system_prompt, allowed_tools, is_active)
VALUES (
  'portfolio-analyst',
  'Portfolio Analyst',
  'Cross-property KPI analysis, investment scenario modeling, and strategic portfolio insights.',
  'chart-bar-line',
  'You are the Portfolio Analyst for Casaora. You provide data-driven insights across the entire property portfolio.

Your responsibilities:
1. KPI TRACKING: Monitor occupancy, revenue, NOI, RevPAR across all properties.
2. COMPARISONS: Benchmark properties against each other and historical performance.
3. SCENARIO MODELING: Run financial projections with adjustable parameters.
4. TREND ANALYSIS: Identify revenue trends, occupancy patterns, expense anomalies.

When analyzing:
- Always reference specific numbers and time periods
- Highlight outliers (both positive and negative)
- Provide actionable recommendations
- Use USD as primary currency with PYG equivalents

Present data clearly with rankings and percentage changes.',
  '["get_portfolio_kpis", "get_property_comparison", "simulate_investment_scenario", "list_rows", "get_row", "get_revenue_analytics", "get_occupancy_forecast", "search_knowledge", "recall_memory", "store_memory"]',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  system_prompt = EXCLUDED.system_prompt,
  allowed_tools = EXCLUDED.allowed_tools,
  description = EXCLUDED.description;

-- ═══════════════════════════════════════════════════════════════════════
-- Phase 2.2: Dynamic Revenue Management — extend pricing_recommendations
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE pricing_recommendations
  ADD COLUMN IF NOT EXISTS auto_applied BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS applied_at   TIMESTAMPTZ;

-- ═══════════════════════════════════════════════════════════════════════
-- Phase 2.3: Predictive Tenant Screening — extend application_submissions
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE application_submissions
  ADD COLUMN IF NOT EXISTS screening_score     SMALLINT,
  ADD COLUMN IF NOT EXISTS screening_breakdown JSONB,
  ADD COLUMN IF NOT EXISTS screened_at         TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_application_submissions_screening
  ON application_submissions(screening_score)
  WHERE screening_score IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════
-- Phase 3.1: Maintenance Dispatch — SLA columns + config table
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE maintenance_requests
  ADD COLUMN IF NOT EXISTS ai_category              text,
  ADD COLUMN IF NOT EXISTS ai_urgency               text,
  ADD COLUMN IF NOT EXISTS ai_confidence             DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS sla_response_deadline     timestamptz,
  ADD COLUMN IF NOT EXISTS sla_resolution_deadline   timestamptz,
  ADD COLUMN IF NOT EXISTS sla_breached              boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_sla_breached
  ON maintenance_requests(organization_id, sla_breached)
  WHERE sla_breached = false
    AND status NOT IN ('completed', 'closed');

CREATE TABLE IF NOT EXISTS maintenance_sla_config (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  urgency         text NOT NULL,
  response_hours  integer NOT NULL DEFAULT 24,
  resolution_hours integer NOT NULL DEFAULT 72,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, urgency)
);

ALTER TABLE maintenance_sla_config ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'maintenance_sla_config'
      AND policyname = 'maintenance_sla_config_org_member_all'
  ) THEN
    CREATE POLICY maintenance_sla_config_org_member_all
      ON maintenance_sla_config FOR ALL
      USING (is_org_member(organization_id))
      WITH CHECK (is_org_member(organization_id));
  END IF;
END $$;

-- Seed default SLA config for existing active orgs
INSERT INTO maintenance_sla_config (organization_id, urgency, response_hours, resolution_hours)
SELECT o.id, s.urgency, s.response_hours, s.resolution_hours
FROM organizations o
CROSS JOIN (
  VALUES
    ('critical', 2, 24),
    ('high', 8, 48),
    ('medium', 24, 72),
    ('low', 48, 168)
) AS s(urgency, response_hours, resolution_hours)
ON CONFLICT (organization_id, urgency) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
-- Phase 3.2: Vendor Orchestration — vendor_roster table
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS vendor_roster (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  contact_phone   text,
  contact_email   text,
  specialties     text[] NOT NULL DEFAULT '{}',
  avg_rating      DOUBLE PRECISION DEFAULT 0,
  total_jobs      integer NOT NULL DEFAULT 0,
  avg_response_hours DOUBLE PRECISION DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_roster_org
  ON vendor_roster(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_vendor_roster_specialties
  ON vendor_roster USING gin(specialties);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_vendor_roster_updated_at'
  ) THEN
    CREATE TRIGGER trg_vendor_roster_updated_at
      BEFORE UPDATE ON vendor_roster
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

ALTER TABLE vendor_roster ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'vendor_roster'
      AND policyname = 'vendor_roster_org_member_all'
  ) THEN
    CREATE POLICY vendor_roster_org_member_all
      ON vendor_roster FOR ALL
      USING (is_org_member(organization_id))
      WITH CHECK (is_org_member(organization_id));
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- Phase 3.3: Vision AI for Inspections — inspection_reports table
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS inspection_reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  unit_id         uuid REFERENCES units(id) ON DELETE SET NULL,
  property_id     uuid REFERENCES properties(id) ON DELETE SET NULL,
  inspection_type text NOT NULL DEFAULT 'routine'
    CHECK (inspection_type IN ('move_in', 'move_out', 'routine', 'damage')),
  photos          jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_analysis     jsonb,
  condition_score SMALLINT CHECK (condition_score BETWEEN 1 AND 5),
  defects         jsonb DEFAULT '[]'::jsonb,
  recommendations jsonb DEFAULT '[]'::jsonb,
  inspected_by    uuid REFERENCES app_users(id) ON DELETE SET NULL,
  inspected_at    timestamptz DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspection_reports_org
  ON inspection_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_inspection_reports_unit
  ON inspection_reports(unit_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_inspection_reports_updated_at'
  ) THEN
    CREATE TRIGGER trg_inspection_reports_updated_at
      BEFORE UPDATE ON inspection_reports
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

ALTER TABLE inspection_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'inspection_reports'
      AND policyname = 'inspection_reports_org_member_all'
  ) THEN
    CREATE POLICY inspection_reports_org_member_all
      ON inspection_reports FOR ALL
      USING (is_org_member(organization_id))
      WITH CHECK (is_org_member(organization_id));
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- Phase 4.2: Lease Abstraction — lease_abstractions table
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS lease_abstractions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_id      uuid,
  lease_id         uuid REFERENCES leases(id) ON DELETE SET NULL,
  extracted_terms  jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence       DOUBLE PRECISION DEFAULT 0,
  reviewed         boolean NOT NULL DEFAULT false,
  reviewed_by      uuid REFERENCES app_users(id) ON DELETE SET NULL,
  reviewed_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lease_abstractions_org
  ON lease_abstractions(organization_id);
CREATE INDEX IF NOT EXISTS idx_lease_abstractions_lease
  ON lease_abstractions(lease_id)
  WHERE lease_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_lease_abstractions_updated_at'
  ) THEN
    CREATE TRIGGER trg_lease_abstractions_updated_at
      BEFORE UPDATE ON lease_abstractions
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

ALTER TABLE lease_abstractions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lease_abstractions'
      AND policyname = 'lease_abstractions_org_member_all'
  ) THEN
    CREATE POLICY lease_abstractions_org_member_all
      ON lease_abstractions FOR ALL
      USING (is_org_member(organization_id))
      WITH CHECK (is_org_member(organization_id));
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- Phase 5.1: Portfolio Intelligence — portfolio_snapshots table
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  snapshot_date   date NOT NULL,
  total_units     integer NOT NULL DEFAULT 0,
  occupied_units  integer NOT NULL DEFAULT 0,
  revenue         numeric(14,2) NOT NULL DEFAULT 0,
  expenses        numeric(14,2) NOT NULL DEFAULT 0,
  noi             numeric(14,2) NOT NULL DEFAULT 0,
  occupancy       double precision NOT NULL DEFAULT 0,
  revpar          numeric(14,2) NOT NULL DEFAULT 0,
  metadata        jsonb DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_org_date
  ON portfolio_snapshots(organization_id, snapshot_date DESC);

ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'portfolio_snapshots'
      AND policyname = 'portfolio_snapshots_org_member_all'
  ) THEN
    CREATE POLICY portfolio_snapshots_org_member_all
      ON portfolio_snapshots FOR ALL
      USING (is_org_member(organization_id))
      WITH CHECK (is_org_member(organization_id));
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- Phase 2.1: Leasing — add workflow trigger events for applications
-- ═══════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'application_received'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'workflow_trigger_event')
  ) THEN
    ALTER TYPE workflow_trigger_event ADD VALUE 'application_received';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'application_stalled_48h'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'workflow_trigger_event')
  ) THEN
    ALTER TYPE workflow_trigger_event ADD VALUE 'application_stalled_48h';
  END IF;
END $$;

-- Add first_response_at column to application_submissions for stall detection
ALTER TABLE application_submissions
  ADD COLUMN IF NOT EXISTS first_response_at timestamptz;
