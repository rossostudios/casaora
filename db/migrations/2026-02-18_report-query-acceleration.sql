-- Report endpoint acceleration indexes
-- 2026-02-18

-- Operations/KPI queries frequently filter task rows by due/completion timestamps.
CREATE INDEX IF NOT EXISTS idx_tasks_org_type_due_at
  ON tasks (organization_id, type, due_at)
  WHERE due_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_org_status
  ON tasks (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_tasks_org_status_sla_due_at
  ON tasks (organization_id, status, sla_due_at)
  WHERE status IN ('todo', 'in_progress') AND sla_due_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_org_maintenance_done_completed_at
  ON tasks (organization_id, completed_at)
  WHERE type = 'maintenance' AND status = 'done' AND completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reservations_org_status_check_out_date
  ON reservations (organization_id, status, check_out_date);

CREATE INDEX IF NOT EXISTS idx_listings_public_published_at
  ON listings (published_at DESC)
  WHERE is_published = true;
