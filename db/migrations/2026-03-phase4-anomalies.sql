-- Phase 4: Anomaly Detection Alerts
-- Stores detected anomalies for dashboard display and agent tool access.

CREATE TABLE IF NOT EXISTS anomaly_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  related_table TEXT,
  related_id UUID,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dismissed_at TIMESTAMPTZ,
  dismissed_by UUID
);

CREATE INDEX idx_anomaly_alerts_org_active
  ON anomaly_alerts(organization_id, is_dismissed)
  WHERE NOT is_dismissed;

-- RLS policies
ALTER TABLE anomaly_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_can_read_anomalies"
  ON anomaly_alerts FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "operators_can_manage_anomalies"
  ON anomaly_alerts FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
        AND role IN ('owner_admin', 'operator', 'accountant')
    )
  );
