-- Task items: add photo evidence support
-- Allows cleaners/operators to attach photos to checklist items as evidence

ALTER TABLE task_items ADD COLUMN IF NOT EXISTS photo_urls jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN task_items.photo_urls IS 'Array of Supabase Storage URLs for photo evidence attached to this checklist item';
