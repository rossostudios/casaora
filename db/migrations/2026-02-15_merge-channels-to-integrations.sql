-- Phase 3: Merge channels + channel_listings → integrations
-- This migration:
--   1. Renames channel_listings → integrations
--   2. Inlines columns from channels (kind, channel_name, external_account_ref)
--   3. Backfills from channels JOIN
--   4. Updates FK references in reservations and listings
--   5. Drops the channels table
-- Depends on: 2026-02-15_rename-listings-to-channel-listings.sql (Phase 1)
--             2026-02-15_rename-marketplace-listings-to-listings.sql (Phase 2)

BEGIN;

-- ============================================================
-- 1. Rename channel_listings → integrations
-- ============================================================

ALTER TABLE channel_listings RENAME TO integrations;

-- ============================================================
-- 2. Add inline columns from channels
-- ============================================================

ALTER TABLE integrations
  ADD COLUMN kind channel_kind,
  ADD COLUMN channel_name text,
  ADD COLUMN external_account_ref text;

-- ============================================================
-- 3. Backfill from channels JOIN
-- ============================================================

UPDATE integrations i
SET kind = c.kind,
    channel_name = c.name,
    external_account_ref = c.external_account_ref
FROM channels c
WHERE i.channel_id = c.id;

-- Now make the inlined columns NOT NULL
ALTER TABLE integrations
  ALTER COLUMN kind SET NOT NULL,
  ALTER COLUMN channel_name SET NOT NULL;

-- ============================================================
-- 4. Rename channel_id → legacy_channel_id (keep temporarily)
-- ============================================================

ALTER TABLE integrations RENAME COLUMN channel_id TO legacy_channel_id;

-- ============================================================
-- 5. Update FK columns in dependent tables
-- ============================================================

-- reservations: channel_listing_id → integration_id, drop channel_id
ALTER TABLE reservations RENAME COLUMN channel_listing_id TO integration_id;
ALTER TABLE reservations DROP COLUMN channel_id;

-- listings: channel_listing_id → integration_id
ALTER TABLE listings RENAME COLUMN channel_listing_id TO integration_id;

-- ============================================================
-- 6. Update unique constraints and indexes
-- ============================================================

-- Drop old unique constraint (unit_id, channel_id) — now (unit_id, legacy_channel_id)
ALTER TABLE integrations DROP CONSTRAINT IF EXISTS channel_listings_unit_id_channel_id_key;

-- New unique constraint: one integration per unit per platform kind per org
ALTER TABLE integrations
  ADD CONSTRAINT integrations_unit_kind_org_unique UNIQUE (unit_id, kind, organization_id);

-- Drop old indexes
DROP INDEX IF EXISTS idx_channel_listings_channel_external;
DROP INDEX IF EXISTS idx_channel_listings_org_id;
DROP INDEX IF EXISTS idx_channel_listings_unit_id;
DROP INDEX IF EXISTS idx_channel_listings_org_public_slug;

-- Create new indexes
CREATE UNIQUE INDEX idx_integrations_kind_external
  ON integrations(kind, external_listing_id)
  WHERE external_listing_id IS NOT NULL;

CREATE INDEX idx_integrations_org_id ON integrations(organization_id);
CREATE INDEX idx_integrations_unit_id ON integrations(unit_id);

CREATE UNIQUE INDEX idx_integrations_org_public_slug
  ON integrations(organization_id, public_slug)
  WHERE public_slug IS NOT NULL;

-- Drop old reservation unique index that referenced channel_id
DROP INDEX IF EXISTS idx_reservations_channel_external;

-- Recreate using integration_id instead
CREATE UNIQUE INDEX idx_reservations_integration_external
  ON reservations(integration_id, external_reservation_id)
  WHERE external_reservation_id IS NOT NULL AND integration_id IS NOT NULL;

-- ============================================================
-- 7. Update triggers and RLS policies
-- ============================================================

-- Drop old triggers
DROP TRIGGER IF EXISTS trg_channel_listings_updated_at ON integrations;
DROP TRIGGER IF EXISTS trg_channels_updated_at ON channels;

-- Create new trigger
CREATE TRIGGER trg_integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Drop old RLS policies
DROP POLICY IF EXISTS channel_listings_org_member_all ON integrations;

-- Disable RLS first to clear slate, then re-enable with new policy
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY integrations_org_member_all
  ON integrations FOR ALL
  USING (is_org_member(organization_id))
  WITH CHECK (is_org_member(organization_id));

-- ============================================================
-- 8. Drop channels table (CASCADE handles FK from integrations)
-- ============================================================

-- First drop the RLS policy on channels
DROP POLICY IF EXISTS channels_org_member_all ON channels;

-- Drop channels table
DROP TABLE channels CASCADE;

-- ============================================================
-- 9. Drop legacy_channel_id column from integrations
-- ============================================================

ALTER TABLE integrations DROP COLUMN legacy_channel_id;

COMMIT;
