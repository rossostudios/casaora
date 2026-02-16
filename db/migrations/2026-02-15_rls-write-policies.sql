-- ============================================================
-- RLS Write Policies: add missing INSERT/UPDATE/DELETE policies
-- that block onboarding and org management flows.
-- Applied 2026-02-15.  Idempotent: safe to run multiple times.
-- ============================================================

-- ---- app_users: self INSERT + UPDATE -------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'app_users' AND policyname = 'app_users_self_insert') THEN
    CREATE POLICY app_users_self_insert ON app_users FOR INSERT
        WITH CHECK (id = auth_user_id());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'app_users' AND policyname = 'app_users_self_update') THEN
    CREATE POLICY app_users_self_update ON app_users FOR UPDATE
        USING (id = auth_user_id())
        WITH CHECK (id = auth_user_id());
  END IF;
END $$;

-- ---- organizations: authenticated INSERT + owner DELETE ------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organizations' AND policyname = 'organizations_authenticated_insert') THEN
    CREATE POLICY organizations_authenticated_insert ON organizations FOR INSERT
        WITH CHECK (auth_user_id() IS NOT NULL AND owner_user_id = auth_user_id());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organizations' AND policyname = 'organizations_owner_delete') THEN
    CREATE POLICY organizations_owner_delete ON organizations FOR DELETE
        USING (owner_user_id = auth_user_id());
  END IF;
END $$;

-- ---- organization_members: bootstrap INSERT for org creation --
-- Fixes chicken-and-egg: owner can insert themselves as first member
-- when they own the org (bypasses existing owner_admin check).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organization_members' AND policyname = 'organization_members_owner_bootstrap') THEN
    CREATE POLICY organization_members_owner_bootstrap ON organization_members FOR INSERT
        WITH CHECK (
            user_id = auth_user_id()
            AND EXISTS (
                SELECT 1 FROM organizations o
                WHERE o.id = organization_members.organization_id
                  AND o.owner_user_id = auth_user_id()
            )
        );
  END IF;
END $$;

-- Allow org owner_admin to delete members
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organization_members' AND policyname = 'organization_members_owner_delete') THEN
    CREATE POLICY organization_members_owner_delete ON organization_members FOR DELETE
        USING (
            EXISTS (
                SELECT 1 FROM organization_members om
                WHERE om.organization_id = organization_members.organization_id
                  AND om.user_id = auth_user_id()
                  AND om.role = 'owner_admin'
            )
        );
  END IF;
END $$;

-- Drop the old catch-all FOR ALL policy and replace with specific UPDATE
-- (eliminates multiple permissive policy warnings)
DROP POLICY IF EXISTS organization_members_owner_write ON organization_members;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organization_members' AND policyname = 'organization_members_owner_update') THEN
    CREATE POLICY organization_members_owner_update ON organization_members FOR UPDATE
        USING (
            EXISTS (
                SELECT 1 FROM organization_members om
                WHERE om.organization_id = organization_members.organization_id
                  AND om.user_id = auth_user_id()
                  AND om.role = 'owner_admin'
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM organization_members om
                WHERE om.organization_id = organization_members.organization_id
                  AND om.user_id = auth_user_id()
                  AND om.role = 'owner_admin'
            )
        );
  END IF;
END $$;

-- ---- integration_events: enable RLS + org-scoped policy ------
ALTER TABLE integration_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'integration_events' AND policyname = 'integration_events_org_member_all') THEN
    CREATE POLICY integration_events_org_member_all ON integration_events FOR ALL
        USING (is_org_member(organization_id))
        WITH CHECK (is_org_member(organization_id));
  END IF;
END $$;
