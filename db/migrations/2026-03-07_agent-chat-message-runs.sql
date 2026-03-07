ALTER TABLE ai_chat_messages
  ADD COLUMN IF NOT EXISTS agent_run_id uuid REFERENCES agent_runs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_run_created
  ON ai_chat_messages(agent_run_id, created_at DESC)
  WHERE agent_run_id IS NOT NULL;
