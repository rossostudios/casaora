-- ============================================================
-- RLS Gap Fix: close remaining RLS gaps found during security
-- audit.  Idempotent: safe to run multiple times.
-- ============================================================

-- ---- guest_access_tokens: backend-only, deny all via RLS -----
-- RLS was enabled in the rebrand migration but no policy was created.
-- These tokens are managed exclusively by the Rust backend using
-- the service-role key, so deny all direct access.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'guest_access_tokens'
      AND policyname = 'guest_access_tokens_deny_all'
  ) THEN
    CREATE POLICY guest_access_tokens_deny_all
      ON guest_access_tokens FOR ALL
      USING (false);
  END IF;
END $$;

-- ---- owner_access_tokens: enable RLS + deny all ---------------
-- Table had no RLS at all. Same pattern as tenant/guest tokens:
-- backend-only via service role.
ALTER TABLE owner_access_tokens ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'owner_access_tokens'
      AND policyname = 'owner_access_tokens_deny_all'
  ) THEN
    CREATE POLICY owner_access_tokens_deny_all
      ON owner_access_tokens FOR ALL
      USING (false);
  END IF;
END $$;

-- ---- reservation_guests: add missing UPDATE policy ------------
-- SELECT, INSERT, DELETE existed; UPDATE was missing.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reservation_guests'
      AND policyname = 'reservation_guests_update'
  ) THEN
    CREATE POLICY reservation_guests_update
      ON reservation_guests FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM reservations r
          WHERE r.id = reservation_guests.reservation_id
            AND is_org_member(r.organization_id)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM reservations r
          WHERE r.id = reservation_guests.reservation_id
            AND is_org_member(r.organization_id)
        )
      );
  END IF;
END $$;

-- ---- app_users: add self-delete policy -------------------------
-- SELECT, INSERT, UPDATE existed; DELETE was missing.
-- Allows users to delete their own account (GDPR right to erasure).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'app_users'
      AND policyname = 'app_users_self_delete'
  ) THEN
    CREATE POLICY app_users_self_delete
      ON app_users FOR DELETE
      USING (id = auth_user_id());
  END IF;
END $$;
