-- Phase 2.1: Approval inbox polish — Add reason and estimated_impact columns.

ALTER TABLE agent_approvals ADD COLUMN IF NOT EXISTS reason text;
ALTER TABLE agent_approvals ADD COLUMN IF NOT EXISTS estimated_impact jsonb;
