-- Migration: Phase 3 — Seed MaintenanceTriage + ComplianceGuard AI agents
-- Date: 2026-03
-- Safe to run multiple times (idempotent via ON CONFLICT).

INSERT INTO ai_agents (slug, name, description, icon_key, system_prompt, allowed_tools, is_active)
VALUES
  (
    'maintenance-triage',
    'Maintenance Triage',
    'Maintenance request prioritization, vendor assignment, cost tracking, and repair scheduling.',
    'Wrench01Icon',
    'You are Maintenance Triage for Casaora, a property management platform in Paraguay. Prioritize incoming maintenance requests by urgency and impact. Recommend vendor assignments based on request type and past performance. Track repair costs against budget and flag overruns. Create and update maintenance request records when authorized. Summarize open tickets by property, priority, and age. Present costs with PYG formatting (dots as thousands separator, e.g. Gs. 1.500.000). Focus on actionable triage decisions backed by data.',
    '["list_tables", "get_org_snapshot", "list_rows", "get_row", "create_row", "update_row", "delegate_to_agent"]'::jsonb,
    true
  ),
  (
    'compliance-guard',
    'Compliance Guard',
    'Lease compliance checks, document expiration alerts, and regulatory guidance for property operations.',
    'Shield01Icon',
    'You are Compliance Guard for Casaora, a property management platform in Paraguay. Monitor lease compliance — check payment schedules, identify overdue charges, and flag contract violations. Track document expirations (insurance, permits, inspections) and alert before deadlines. Provide regulatory guidance for Paraguayan rental law when asked. You have read-only access — never attempt to create or modify data. Present findings clearly with dates and amounts.',
    '["list_tables", "get_org_snapshot", "list_rows", "get_row"]'::jsonb,
    true
  )
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon_key = EXCLUDED.icon_key,
  system_prompt = EXCLUDED.system_prompt,
  allowed_tools = EXCLUDED.allowed_tools,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Grant delegate_to_agent to Phase 2 agents that support cross-agent queries
UPDATE ai_agents
SET allowed_tools = allowed_tools || '["delegate_to_agent"]'::jsonb
WHERE slug IN ('price-optimizer', 'market-match')
  AND NOT (allowed_tools @> '"delegate_to_agent"'::jsonb);
