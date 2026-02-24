-- S20: Feature gating — extend subscription_plans with new limit fields.

ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS max_integrations integer;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS max_workflow_rules integer;
