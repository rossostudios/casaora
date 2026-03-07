ALTER TABLE ai_agents
  ADD COLUMN IF NOT EXISTS model_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS autonomy_policy jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ai_agents_model_policy_check'
  ) THEN
    ALTER TABLE ai_agents
      ADD CONSTRAINT ai_agents_model_policy_check
      CHECK (jsonb_typeof(model_policy) = 'object');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ai_agents_autonomy_policy_check'
  ) THEN
    ALTER TABLE ai_agents
      ADD CONSTRAINT ai_agents_autonomy_policy_check
      CHECK (jsonb_typeof(autonomy_policy) = 'object');
  END IF;
END $$;

ALTER TABLE agent_traces
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS stop_reason text,
  ADD COLUMN IF NOT EXISTS cache_creation_input_tokens integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cache_read_input_tokens integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fallback_from text,
  ADD COLUMN IF NOT EXISTS run_mode text NOT NULL DEFAULT 'copilot';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'agent_traces_run_mode_check'
  ) THEN
    ALTER TABLE agent_traces
      ADD CONSTRAINT agent_traces_run_mode_check
      CHECK (run_mode IN ('copilot', 'autonomous'));
  END IF;
END $$;

UPDATE ai_agents
SET
  model_policy = jsonb_build_object(
    'defaultProvider', 'openai',
    'defaultModel', 'gpt-5.2',
    'fallbackChain', jsonb_build_array(
      jsonb_build_object('provider', 'openai', 'model', 'gpt-5-mini'),
      jsonb_build_object('provider', 'anthropic', 'model', 'claude-sonnet-4-6')
    ),
    'longContextProvider', 'anthropic',
    'longContextThresholdTokens', 120000,
    'reasoningEffort', 'medium',
    'costCeilingUsd', 2.5
  )
WHERE model_policy = '{}'::jsonb;

UPDATE ai_agents
SET autonomy_policy = jsonb_build_object(
  'defaultMode', 'copilot',
  'allowMutationsByDefault', false,
  'allowAutonomousLowRisk', false,
  'approvalMode', 'selective'
)
WHERE autonomy_policy = '{}'::jsonb;

CREATE TABLE IF NOT EXISTS agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  chat_id uuid REFERENCES ai_chats(id) ON DELETE SET NULL,
  agent_slug text NOT NULL DEFAULT 'supervisor',
  mode text NOT NULL DEFAULT 'copilot'
    CHECK (mode IN ('copilot', 'autonomous')),
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'waiting_for_approval', 'failed', 'completed', 'cancelled')),
  task text NOT NULL,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  preferred_provider text
    CHECK (preferred_provider IS NULL OR preferred_provider IN ('openai', 'anthropic')),
  preferred_model text,
  allow_mutations boolean NOT NULL DEFAULT false,
  provider text,
  model text,
  token_usage jsonb NOT NULL DEFAULT '{}'::jsonb,
  cost_estimate_usd numeric(12,6),
  result jsonb,
  error_message text,
  runtime_trace_id text,
  created_by_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  cancelled_by_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_org_created
  ON agent_runs (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_runs_org_status_created
  ON agent_runs (organization_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_runs_chat
  ON agent_runs (chat_id)
  WHERE chat_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_agent_runs_updated_at'
  ) THEN
    CREATE TRIGGER trg_agent_runs_updated_at
      BEFORE UPDATE ON agent_runs
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS agent_run_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type text NOT NULL
    CHECK (event_type IN ('status', 'text_delta', 'tool_call', 'tool_result', 'approval_required', 'error')),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_run_events_run_created
  ON agent_run_events (run_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_agent_run_events_org_created
  ON agent_run_events (organization_id, created_at DESC);

ALTER TABLE agent_approvals
  ADD COLUMN IF NOT EXISTS agent_run_id uuid REFERENCES agent_runs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_agent_approvals_run
  ON agent_approvals (agent_run_id)
  WHERE agent_run_id IS NOT NULL;
