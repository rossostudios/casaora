-- Sprint 3: Dynamic Revenue Optimization
-- Adds market data snapshots, extended pricing recommendations, and pricing rule sets.

-- ═══════════════════════════════════════════════════════════════════════
-- 1. Market Data Snapshots — competitor rates, demand indices
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS market_data_snapshots (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id       uuid REFERENCES properties(id) ON DELETE SET NULL,
  snapshot_date     date NOT NULL,
  source            text NOT NULL DEFAULT 'manual'
                      CHECK (source IN ('manual', 'ical_import', 'api_scrape', 'competitor_feed')),
  competitor_name   text,
  competitor_rate   double precision,
  competitor_occupancy double precision,
  demand_index      double precision,
  event_indicator   text,
  local_avg_rate    double precision,
  notes             text,
  raw_data          jsonb DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_market_data_snapshots_org_date
  ON market_data_snapshots(org_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_market_data_snapshots_property
  ON market_data_snapshots(property_id, snapshot_date DESC)
  WHERE property_id IS NOT NULL;

ALTER TABLE market_data_snapshots ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'market_data_snapshots'
      AND policyname = 'market_data_snapshots_org_member_all'
  ) THEN
    CREATE POLICY market_data_snapshots_org_member_all
      ON market_data_snapshots FOR ALL
      USING (is_org_member(org_id))
      WITH CHECK (is_org_member(org_id));
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- 2. Extend pricing_recommendations with ML scoring fields
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE pricing_recommendations
  ADD COLUMN IF NOT EXISTS confidence_score double precision DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS seasonal_adjustment double precision DEFAULT 0,
  ADD COLUMN IF NOT EXISTS demand_adjustment double precision DEFAULT 0,
  ADD COLUMN IF NOT EXISTS competitor_adjustment double precision DEFAULT 0,
  ADD COLUMN IF NOT EXISTS day_of_week_factor double precision DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS length_of_stay_discount double precision DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_minute_adjustment double precision DEFAULT 0,
  ADD COLUMN IF NOT EXISTS projected_revenue double precision,
  ADD COLUMN IF NOT EXISTS projected_occupancy double precision;

-- ═══════════════════════════════════════════════════════════════════════
-- 3. Pricing Rule Sets — configurable min/max rates and adjustments
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pricing_rule_sets (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                text NOT NULL,
  description         text,
  is_active           boolean NOT NULL DEFAULT true,
  min_rate            double precision,
  max_rate            double precision,
  weekend_premium_pct double precision DEFAULT 0,
  holiday_premium_pct double precision DEFAULT 0,
  low_season_discount_pct double precision DEFAULT 0,
  high_season_premium_pct double precision DEFAULT 0,
  last_minute_days    integer DEFAULT 3,
  last_minute_discount_pct double precision DEFAULT 0,
  long_stay_threshold_days integer DEFAULT 7,
  long_stay_discount_pct double precision DEFAULT 0,
  day_of_week_factors jsonb DEFAULT '{"mon":1,"tue":1,"wed":1,"thu":1,"fri":1.1,"sat":1.15,"sun":1.1}',
  seasonal_config     jsonb DEFAULT '[]',
  applies_to_units    uuid[] DEFAULT '{}',
  applies_to_properties uuid[] DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pricing_rule_sets_org
  ON pricing_rule_sets(org_id, is_active);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_pricing_rule_sets_updated_at'
  ) THEN
    CREATE TRIGGER trg_pricing_rule_sets_updated_at
      BEFORE UPDATE ON pricing_rule_sets
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

ALTER TABLE pricing_rule_sets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pricing_rule_sets'
      AND policyname = 'pricing_rule_sets_org_member_all'
  ) THEN
    CREATE POLICY pricing_rule_sets_org_member_all
      ON pricing_rule_sets FOR ALL
      USING (is_org_member(org_id))
      WITH CHECK (is_org_member(org_id));
  END IF;
END $$;
