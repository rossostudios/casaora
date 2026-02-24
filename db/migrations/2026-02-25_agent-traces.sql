-- Agent tracing infrastructure for LLM usage, latency, and cost tracking.
-- Phase 1.3: Records every agent run with token counts, tool calls, and timing.

CREATE TABLE IF NOT EXISTS agent_traces (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    chat_id uuid,
    agent_slug text NOT NULL DEFAULT 'supervisor',
    user_id uuid,
    model_used text,
    prompt_tokens int DEFAULT 0,
    completion_tokens int DEFAULT 0,
    total_tokens int DEFAULT 0,
    latency_ms int DEFAULT 0,
    tool_calls jsonb DEFAULT '[]'::jsonb,
    tool_count int DEFAULT 0,
    fallback_used boolean DEFAULT false,
    success boolean DEFAULT true,
    error_message text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE agent_traces ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'agent_traces' AND policyname = 'agent_traces_org_isolation'
    ) THEN
        CREATE POLICY agent_traces_org_isolation ON agent_traces
            USING (organization_id IN (
                SELECT organization_id FROM organization_members
                WHERE user_id = auth.uid()
            ));
    END IF;
END $$;

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_agent_traces_org_created
    ON agent_traces (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_traces_org_agent_created
    ON agent_traces (organization_id, agent_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_traces_chat
    ON agent_traces (chat_id) WHERE chat_id IS NOT NULL;
