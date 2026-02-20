-- Add per-thread preferred model selection for AI chats.

ALTER TABLE ai_chats
  ADD COLUMN IF NOT EXISTS preferred_model TEXT;

UPDATE ai_chats
SET preferred_model = NULL
WHERE preferred_model IS NOT NULL
  AND btrim(preferred_model) = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ai_chats_preferred_model_not_blank'
  ) THEN
    ALTER TABLE ai_chats
      ADD CONSTRAINT ai_chats_preferred_model_not_blank
      CHECK (preferred_model IS NULL OR btrim(preferred_model) <> '');
  END IF;
END $$;
