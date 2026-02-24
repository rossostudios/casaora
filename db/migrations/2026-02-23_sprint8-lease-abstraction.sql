-- Sprint 8: Lease Abstraction & Compliance
-- Extends lease_abstractions with structured clauses, compliance flags,
-- per-field confidence. Adds compliance_rules and deadline_alerts.

-- ═══════════════════════════════════════════════════════════════════════
-- 1. Extend lease_abstractions — clauses, deadlines, compliance, confidence
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE lease_abstractions
  ADD COLUMN IF NOT EXISTS clauses            jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS deadlines          jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS compliance_flags   jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS confidence_scores  jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS human_verified     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_by        uuid REFERENCES app_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_at        timestamptz,
  ADD COLUMN IF NOT EXISTS field_count        integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extraction_model   text DEFAULT 'gpt-4o-mini';

COMMENT ON COLUMN lease_abstractions.clauses IS
  'Array of {type, title, text, page, importance} clause objects';
COMMENT ON COLUMN lease_abstractions.deadlines IS
  'Array of {type, date, description, reminder_days} deadline objects';
COMMENT ON COLUMN lease_abstractions.compliance_flags IS
  'Array of {rule_id, severity, description, resolved} flag objects';
COMMENT ON COLUMN lease_abstractions.confidence_scores IS
  'Per-field confidence: {field_name: 0.0-1.0}';

-- ═══════════════════════════════════════════════════════════════════════
-- 2. Compliance Rules — Paraguayan law + custom org rules
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS compliance_rules (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid REFERENCES organizations(id) ON DELETE CASCADE,
  rule_type         text NOT NULL DEFAULT 'custom'
                      CHECK (rule_type IN ('paraguayan_law', 'custom', 'best_practice')),
  category          text NOT NULL DEFAULT 'general'
                      CHECK (category IN ('general', 'financial', 'duration', 'deposit',
                                           'maintenance', 'termination', 'tax', 'guarantor')),
  name              text NOT NULL,
  description       text NOT NULL,
  check_expression  text,
  severity          text NOT NULL DEFAULT 'warning'
                      CHECK (severity IN ('critical', 'warning', 'info')),
  is_active         boolean NOT NULL DEFAULT true,
  legal_reference   text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compliance_rules_org
  ON compliance_rules(organization_id)
  WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_compliance_rules_type
  ON compliance_rules(rule_type, is_active);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_compliance_rules_updated_at'
  ) THEN
    CREATE TRIGGER trg_compliance_rules_updated_at
      BEFORE UPDATE ON compliance_rules
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

ALTER TABLE compliance_rules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'compliance_rules'
      AND policyname = 'compliance_rules_org_member_all'
  ) THEN
    CREATE POLICY compliance_rules_org_member_all
      ON compliance_rules FOR ALL
      USING (organization_id IS NULL OR is_org_member(organization_id))
      WITH CHECK (organization_id IS NULL OR is_org_member(organization_id));
  END IF;
END $$;

-- Seed default Paraguayan law rules (org_id NULL = global)
INSERT INTO compliance_rules (organization_id, rule_type, category, name, description, severity, legal_reference)
VALUES
  (NULL, 'paraguayan_law', 'deposit', 'Max security deposit',
   'Security deposit must not exceed one month rent per Paraguayan Civil Code.',
   'critical', 'Código Civil Art. 805'),
  (NULL, 'paraguayan_law', 'tax', 'IVA clause required',
   'Lease must include IVA (10%) clause for commercial/rental income.',
   'warning', 'Ley 125/91 Art. 77'),
  (NULL, 'paraguayan_law', 'financial', 'RUC identification',
   'Landlord RUC number should be present for tax compliance.',
   'warning', 'SET Resolution 2014'),
  (NULL, 'paraguayan_law', 'guarantor', 'Guarantor clause',
   'Residential leases should include guarantor (fiador) or alternative security.',
   'info', 'Código Civil Art. 1574'),
  (NULL, 'paraguayan_law', 'duration', 'Minimum lease term',
   'Residential leases have a minimum 2-year term unless otherwise agreed in writing.',
   'warning', 'Código Civil Art. 812'),
  (NULL, 'paraguayan_law', 'termination', 'Notice period',
   'Termination requires minimum 60-day written notice.',
   'critical', 'Código Civil Art. 814'),
  (NULL, 'best_practice', 'maintenance', 'Maintenance responsibility clause',
   'Lease should clearly define maintenance responsibilities between landlord and tenant.',
   'info', NULL),
  (NULL, 'best_practice', 'general', 'Inventory checklist',
   'Lease should reference an inventory/condition checklist signed by both parties.',
   'info', NULL)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
-- 3. Deadline Alerts — lease deadline notifications
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS deadline_alerts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lease_id          uuid REFERENCES leases(id) ON DELETE CASCADE,
  abstraction_id    uuid REFERENCES lease_abstractions(id) ON DELETE SET NULL,
  deadline_type     text NOT NULL DEFAULT 'expiry'
                      CHECK (deadline_type IN ('expiry', 'renewal', 'rent_increase',
                                                'inspection', 'insurance', 'tax_filing',
                                                'notice_period', 'custom')),
  deadline_date     date NOT NULL,
  description       text NOT NULL,
  reminder_days     integer[] DEFAULT '{60,30,7}',
  status            text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'notified', 'acknowledged', 'resolved')),
  last_notified_at  timestamptz,
  resolved_at       timestamptz,
  resolved_by       uuid REFERENCES app_users(id) ON DELETE SET NULL,
  metadata          jsonb DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deadline_alerts_org_date
  ON deadline_alerts(organization_id, deadline_date)
  WHERE status IN ('pending', 'notified');
CREATE INDEX IF NOT EXISTS idx_deadline_alerts_lease
  ON deadline_alerts(lease_id)
  WHERE lease_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_deadline_alerts_updated_at'
  ) THEN
    CREATE TRIGGER trg_deadline_alerts_updated_at
      BEFORE UPDATE ON deadline_alerts
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

ALTER TABLE deadline_alerts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'deadline_alerts'
      AND policyname = 'deadline_alerts_org_member_all'
  ) THEN
    CREATE POLICY deadline_alerts_org_member_all
      ON deadline_alerts FOR ALL
      USING (is_org_member(organization_id))
      WITH CHECK (is_org_member(organization_id));
  END IF;
END $$;
