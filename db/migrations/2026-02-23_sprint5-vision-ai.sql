-- Sprint 5: Vision AI & Inspections
-- Adds condition baselines and extends inspection_reports for comparison.

-- ═══════════════════════════════════════════════════════════════════════
-- 1. Condition Baselines — baseline photos/scores per room per unit
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS condition_baselines (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  unit_id           uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  room_name         text NOT NULL,
  baseline_photos   text[] DEFAULT '{}',
  condition_score   smallint CHECK (condition_score BETWEEN 1 AND 5),
  notes             text,
  baseline_date     date NOT NULL DEFAULT CURRENT_DATE,
  inspection_id     uuid REFERENCES inspection_reports(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_condition_baselines_unit
  ON condition_baselines(unit_id, room_name);
CREATE INDEX IF NOT EXISTS idx_condition_baselines_org
  ON condition_baselines(organization_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_condition_baselines_updated_at'
  ) THEN
    CREATE TRIGGER trg_condition_baselines_updated_at
      BEFORE UPDATE ON condition_baselines
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

ALTER TABLE condition_baselines ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'condition_baselines'
      AND policyname = 'condition_baselines_org_member_all'
  ) THEN
    CREATE POLICY condition_baselines_org_member_all
      ON condition_baselines FOR ALL
      USING (is_org_member(organization_id))
      WITH CHECK (is_org_member(organization_id));
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- 2. Extend inspection_reports with comparison and verification fields
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE inspection_reports
  ADD COLUMN IF NOT EXISTS comparison_baseline_id uuid REFERENCES inspection_reports(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS degradation_score double precision,
  ADD COLUMN IF NOT EXISTS rooms jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS urgent_issues jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS human_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;
