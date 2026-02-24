-- Phase 3.2: Memory layer improvements — Add memory tiers and cross-agent sharing.

ALTER TABLE agent_memory ADD COLUMN IF NOT EXISTS memory_tier text DEFAULT 'general'
    CHECK (memory_tier IN ('episodic', 'semantic', 'entity', 'general'));
ALTER TABLE agent_memory ADD COLUMN IF NOT EXISTS shared boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_agent_memory_shared
    ON agent_memory (organization_id, shared) WHERE shared = true;
CREATE INDEX IF NOT EXISTS idx_agent_memory_tier
    ON agent_memory (organization_id, agent_slug, memory_tier);
