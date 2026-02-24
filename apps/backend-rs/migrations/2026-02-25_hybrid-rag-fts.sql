-- Phase 1.2: Hybrid RAG — Add full-text search vectors to knowledge_chunks and agent_memory.
-- Enables combined vector + tsvector search with RRF fusion for ~84% precision.

-- Knowledge chunks FTS
ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS fts_vector tsvector;
UPDATE knowledge_chunks SET fts_vector = to_tsvector('english', content) WHERE fts_vector IS NULL;
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_fts ON knowledge_chunks USING gin(fts_vector);

-- Auto-update trigger for knowledge_chunks
CREATE OR REPLACE FUNCTION knowledge_chunks_fts_trigger() RETURNS trigger AS $$
BEGIN
    NEW.fts_vector := to_tsvector('english', COALESCE(NEW.content, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_knowledge_chunks_fts ON knowledge_chunks;
CREATE TRIGGER trg_knowledge_chunks_fts
    BEFORE INSERT OR UPDATE OF content ON knowledge_chunks
    FOR EACH ROW EXECUTE FUNCTION knowledge_chunks_fts_trigger();

-- Agent memory FTS
ALTER TABLE agent_memory ADD COLUMN IF NOT EXISTS fts_vector tsvector;
UPDATE agent_memory SET fts_vector = to_tsvector('english', COALESCE(memory_key, '') || ' ' || COALESCE(memory_value, ''))
    WHERE fts_vector IS NULL;
CREATE INDEX IF NOT EXISTS idx_agent_memory_fts ON agent_memory USING gin(fts_vector);

-- Auto-update trigger for agent_memory
CREATE OR REPLACE FUNCTION agent_memory_fts_trigger() RETURNS trigger AS $$
BEGIN
    NEW.fts_vector := to_tsvector('english', COALESCE(NEW.memory_key, '') || ' ' || COALESCE(NEW.memory_value, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agent_memory_fts ON agent_memory;
CREATE TRIGGER trg_agent_memory_fts
    BEFORE INSERT OR UPDATE OF memory_key, memory_value ON agent_memory
    FOR EACH ROW EXECUTE FUNCTION agent_memory_fts_trigger();
