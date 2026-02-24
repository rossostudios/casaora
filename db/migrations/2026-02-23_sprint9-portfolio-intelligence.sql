-- Sprint 9: Portfolio Intelligence Hub
-- Extends portfolio_snapshots with property-level KPIs and trends.
-- Adds portfolio_benchmarks and performance_digests.

-- ═══════════════════════════════════════════════════════════════════════
-- 1. Extend portfolio_snapshots — property-level KPIs, trend data
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE portfolio_snapshots
  ADD COLUMN IF NOT EXISTS property_level_kpis jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS trend_data          jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS benchmark_data      jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS adr                 numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active_leases       integer DEFAULT 0;

COMMENT ON COLUMN portfolio_snapshots.property_level_kpis IS
  'Array of {property_id, name, units, occupied, revenue, expenses, noi, occupancy, revpar}';
COMMENT ON COLUMN portfolio_snapshots.trend_data IS
  'Rolling trends: {revenue_7d, revenue_30d, occupancy_7d, occupancy_30d}';

-- ═══════════════════════════════════════════════════════════════════════
-- 2. Portfolio Benchmarks — market, historical, target benchmarks
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS portfolio_benchmarks (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  benchmark_type    text NOT NULL DEFAULT 'target'
                      CHECK (benchmark_type IN ('market', 'historical', 'target')),
  metric            text NOT NULL
                      CHECK (metric IN ('occupancy', 'revenue', 'noi', 'revpar', 'adr', 'expenses')),
  value             double precision NOT NULL DEFAULT 0,
  period            text DEFAULT 'monthly'
                      CHECK (period IN ('daily', 'weekly', 'monthly', 'yearly')),
  property_id       uuid REFERENCES properties(id) ON DELETE CASCADE,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_benchmarks_org
  ON portfolio_benchmarks(organization_id, metric);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_portfolio_benchmarks_updated_at'
  ) THEN
    CREATE TRIGGER trg_portfolio_benchmarks_updated_at
      BEFORE UPDATE ON portfolio_benchmarks
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

ALTER TABLE portfolio_benchmarks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'portfolio_benchmarks'
      AND policyname = 'portfolio_benchmarks_org_member_all'
  ) THEN
    CREATE POLICY portfolio_benchmarks_org_member_all
      ON portfolio_benchmarks FOR ALL
      USING (is_org_member(organization_id))
      WITH CHECK (is_org_member(organization_id));
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- 3. Performance Digests — weekly/monthly auto-reports
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS performance_digests (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  digest_type       text NOT NULL DEFAULT 'weekly'
                      CHECK (digest_type IN ('weekly', 'monthly')),
  period_start      date NOT NULL,
  period_end        date NOT NULL,
  summary           text,
  kpis              jsonb NOT NULL DEFAULT '{}'::jsonb,
  highlights        jsonb DEFAULT '[]'::jsonb,
  concerns          jsonb DEFAULT '[]'::jsonb,
  recommendations   jsonb DEFAULT '[]'::jsonb,
  property_breakdown jsonb DEFAULT '[]'::jsonb,
  sent_at           timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_performance_digests_org
  ON performance_digests(organization_id, period_start DESC);

ALTER TABLE performance_digests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'performance_digests'
      AND policyname = 'performance_digests_org_member_all'
  ) THEN
    CREATE POLICY performance_digests_org_member_all
      ON performance_digests FOR ALL
      USING (is_org_member(organization_id))
      WITH CHECK (is_org_member(organization_id));
  END IF;
END $$;
