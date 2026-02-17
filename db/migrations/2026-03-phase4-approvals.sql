-- Phase 4: Human-in-Loop Agent Approval Queue
-- Stores pending mutation requests from AI agents that require human review.

CREATE TABLE IF NOT EXISTS agent_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  chat_id UUID REFERENCES ai_chats(id) ON DELETE SET NULL,
  agent_slug TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  tool_args JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by UUID,
  reviewed_by UUID,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX idx_agent_approvals_org_status ON agent_approvals(organization_id, status);
CREATE INDEX idx_agent_approvals_chat ON agent_approvals(chat_id) WHERE chat_id IS NOT NULL;

-- RLS policies
ALTER TABLE agent_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_can_read_approvals"
  ON agent_approvals FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "operators_can_manage_approvals"
  ON agent_approvals FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
        AND role IN ('owner_admin', 'operator', 'accountant')
    )
  );
