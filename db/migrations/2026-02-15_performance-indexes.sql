-- Performance indexes for common query patterns
-- 2026-02-15

-- organization_members: used in every auth/membership check
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id
  ON organization_members (user_id);

-- tasks: task list queries filtered by org + status
CREATE INDEX IF NOT EXISTS idx_tasks_org_status
  ON tasks (organization_id, status);

-- audit_logs: audit queries filtered by org + time
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created
  ON audit_logs (organization_id, created_at DESC);

-- reservations: calendar and availability queries
CREATE INDEX IF NOT EXISTS idx_reservations_org_checkin
  ON reservations (organization_id, check_in_date);
