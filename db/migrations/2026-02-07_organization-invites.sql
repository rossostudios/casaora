-- Migration: Organization invites (email-based onboarding)
-- Date: 2026-02-07
--
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS organization_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email citext NOT NULL,
  role member_role NOT NULL DEFAULT 'operator',
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18), 'hex'),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_by_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  accepted_by_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  revoked_by_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_org_invites_unique_pending_email
  ON organization_invites(organization_id, email)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_org_invites_org_status_created
  ON organization_invites(organization_id, status, created_at DESC);

-- updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_organization_invites_updated_at'
  ) THEN
    CREATE TRIGGER trg_organization_invites_updated_at
      BEFORE UPDATE ON organization_invites
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- RLS policy (optional, Supabase-friendly)
ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'organization_invites'
      AND policyname = 'organization_invites_owner_admin_all'
  ) THEN
    CREATE POLICY organization_invites_owner_admin_all
      ON organization_invites FOR ALL
      USING (
        EXISTS (
          SELECT 1
          FROM organization_members om
          WHERE om.organization_id = organization_invites.organization_id
            AND om.user_id = auth_user_id()
            AND om.role = 'owner_admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM organization_members om
          WHERE om.organization_id = organization_invites.organization_id
            AND om.user_id = auth_user_id()
            AND om.role = 'owner_admin'
        )
      );
  END IF;
END $$;

