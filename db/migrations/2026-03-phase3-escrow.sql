-- Migration: Phase 3 — Escrow deposit lifecycle
-- Date: 2026-03
-- Adds deposit tracking columns to reservations and escrow_events audit trail.

-- 1. Add deposit tracking columns to reservations
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS deposit_status text NOT NULL DEFAULT 'none'
    CHECK (deposit_status IN ('none', 'pending', 'collected', 'held', 'released', 'forfeited')),
  ADD COLUMN IF NOT EXISTS deposit_amount numeric(14,2),
  ADD COLUMN IF NOT EXISTS deposit_currency text DEFAULT 'PYG';

-- 2. Create escrow_events audit trail
CREATE TABLE IF NOT EXISTS escrow_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('collected', 'held', 'released', 'forfeited', 'auto_released')),
  amount numeric(14,2),
  currency text DEFAULT 'PYG',
  note text,
  performed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_escrow_events_reservation ON escrow_events(reservation_id);
CREATE INDEX IF NOT EXISTS idx_escrow_events_org ON escrow_events(organization_id);

-- 3. RLS policies
ALTER TABLE escrow_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY escrow_events_org_read ON escrow_events
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY escrow_events_org_insert ON escrow_events
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner_admin', 'operator')
    )
  );
