-- Phase 1: Full Agentic Platform — Close the Loop
-- Adds: invoke_agent action type, confidence-based approvals,
--        IoT workflow triggers, auto-pricing org settings.
-- IoT tables (iot_devices, iot_events, access_codes) already exist
-- from sprint10-iot-integration migration.

-- ═══════════════════════════════════════════════════════════════════════
-- 1. Add invoke_agent to workflow_action_type enum
-- ═══════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  BEGIN ALTER TYPE workflow_action_type ADD VALUE IF NOT EXISTS 'invoke_agent'; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- 2. Add IoT workflow trigger events
-- ═══════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  BEGIN ALTER TYPE workflow_trigger_event ADD VALUE IF NOT EXISTS 'iot_alert'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE workflow_trigger_event ADD VALUE IF NOT EXISTS 'device_offline'; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- 3. Confidence-based approval policies
--    Widen approval_mode check, add threshold + expanded tool_name set
-- ═══════════════════════════════════════════════════════════════════════

-- Drop old constraints and recreate with wider values
ALTER TABLE agent_approval_policies
  DROP CONSTRAINT IF EXISTS agent_approval_policies_approval_mode_check;
ALTER TABLE agent_approval_policies
  ADD CONSTRAINT agent_approval_policies_approval_mode_check
    CHECK (approval_mode IN ('required', 'auto', 'confidence'));

ALTER TABLE agent_approval_policies
  DROP CONSTRAINT IF EXISTS agent_approval_policies_tool_name_check;
ALTER TABLE agent_approval_policies
  ADD CONSTRAINT agent_approval_policies_tool_name_check
    CHECK (tool_name ~ '^[a-z_]+$');

-- Add threshold column (0.00–1.00, default 0.85)
ALTER TABLE agent_approval_policies
  ADD COLUMN IF NOT EXISTS auto_approve_threshold numeric(3,2) DEFAULT 0.85;

-- ═══════════════════════════════════════════════════════════════════════
-- 4. Auto-pricing settings on organizations
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS auto_pricing_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS auto_pricing_max_delta_pct numeric(5,2) NOT NULL DEFAULT 10.0;

-- ═══════════════════════════════════════════════════════════════════════
-- 5. Add last_seen_at index for IoT device health checks
-- ═══════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_iot_devices_health
  ON iot_devices(organization_id, status, last_seen_at)
  WHERE is_active = true;

-- ═══════════════════════════════════════════════════════════════════════
-- 6. Seed default workflow rule: anomaly_detected → invoke finance-agent
--    Only for orgs that have no anomaly_detected rule yet.
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO workflow_rules (organization_id, name, trigger_event, action_type, action_config, is_active)
SELECT o.id,
       'Auto-invoke finance agent on anomalies',
       'anomaly_detected',
       'invoke_agent',
       '{"agent_slug": "finance-agent", "message_template": "Anomaly detected: {{title}} ({{severity}}). Investigate and recommend action."}'::jsonb,
       true
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM workflow_rules wr
  WHERE wr.organization_id = o.id
    AND wr.trigger_event = 'anomaly_detected'
)
ON CONFLICT DO NOTHING;
