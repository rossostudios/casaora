-- Migration: Phase 3 — Saved searches for marketplace visitors
-- Date: 2026-03
-- No auth required — uses client-generated visitor_id from localStorage.

CREATE TABLE IF NOT EXISTS saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id uuid NOT NULL,
  name text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_visitor ON saved_searches(visitor_id);
