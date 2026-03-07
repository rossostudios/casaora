ALTER TABLE message_logs
  ADD COLUMN IF NOT EXISTS application_id uuid REFERENCES application_submissions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_message_logs_org_application_created
  ON message_logs(organization_id, application_id, created_at DESC);
