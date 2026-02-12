-- Migration: Organization profile type for setup onboarding wizard
-- Date: 2026-02-12
-- Safe to run multiple times.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'organization_profile_type'
  ) THEN
    CREATE TYPE organization_profile_type AS ENUM (
      'owner_operator',
      'management_company'
    );
  END IF;
END $$;

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS profile_type organization_profile_type;

UPDATE organizations
SET profile_type = 'management_company'
WHERE profile_type IS NULL;

ALTER TABLE organizations
  ALTER COLUMN profile_type SET DEFAULT 'management_company',
  ALTER COLUMN profile_type SET NOT NULL;
