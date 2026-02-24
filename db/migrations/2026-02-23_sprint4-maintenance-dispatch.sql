-- Sprint 4: Self-Driving Maintenance
-- Extends vendor roster, adds work orders, and enhances SLA config.

-- ═══════════════════════════════════════════════════════════════════════
-- 1. Extend vendor_roster with performance metrics
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE vendor_roster
  ADD COLUMN IF NOT EXISTS completion_rate double precision DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_concurrent_jobs integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS current_active_jobs integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_area text,
  ADD COLUMN IF NOT EXISTS hourly_rate double precision;

-- ═══════════════════════════════════════════════════════════════════════
-- 2. Vendor Work Orders — full lifecycle with photos
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS vendor_work_orders (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  maintenance_request_id uuid REFERENCES maintenance_requests(id) ON DELETE SET NULL,
  vendor_id         uuid NOT NULL REFERENCES vendor_roster(id) ON DELETE CASCADE,
  status            text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed',
                                        'verified', 'rejected', 'cancelled')),
  priority          text DEFAULT 'medium'
                      CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  description       text NOT NULL,
  estimated_cost    double precision,
  actual_cost       double precision,
  scheduled_date    date,
  accepted_at       timestamptz,
  started_at        timestamptz,
  completed_at      timestamptz,
  verified_at       timestamptz,
  before_photos     text[] DEFAULT '{}',
  after_photos      text[] DEFAULT '{}',
  vendor_notes      text,
  staff_notes       text,
  rating            integer CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_work_orders_org
  ON vendor_work_orders(org_id, status);
CREATE INDEX IF NOT EXISTS idx_vendor_work_orders_vendor
  ON vendor_work_orders(vendor_id, status);
CREATE INDEX IF NOT EXISTS idx_vendor_work_orders_maintenance
  ON vendor_work_orders(maintenance_request_id)
  WHERE maintenance_request_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_vendor_work_orders_updated_at'
  ) THEN
    CREATE TRIGGER trg_vendor_work_orders_updated_at
      BEFORE UPDATE ON vendor_work_orders
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

ALTER TABLE vendor_work_orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'vendor_work_orders'
      AND policyname = 'vendor_work_orders_org_member_all'
  ) THEN
    CREATE POLICY vendor_work_orders_org_member_all
      ON vendor_work_orders FOR ALL
      USING (is_org_member(org_id))
      WITH CHECK (is_org_member(org_id));
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- 3. Extend maintenance_sla_config with auto-escalation fields
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE maintenance_sla_config
  ADD COLUMN IF NOT EXISTS auto_escalate boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS escalation_notify_channel text DEFAULT 'in_app'
    CHECK (escalation_notify_channel IS NULL OR
           escalation_notify_channel IN ('in_app', 'email', 'whatsapp', 'sms')),
  ADD COLUMN IF NOT EXISTS escalation_target text;
