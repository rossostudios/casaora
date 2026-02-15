-- ============================================================
-- RLS Hardening: enable Row Level Security on 9 tables that
-- were missing policies.  Applied 2026-02-15.
-- Idempotent: safe to run multiple times.
-- ============================================================

-- Helper: resolve the auth user id from the JWT (Supabase convention).
CREATE OR REPLACE FUNCTION auth_user_id() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$ SELECT auth.uid() $$;

-- Helper: returns true when the current JWT user is a member of the org.
CREATE OR REPLACE FUNCTION is_org_member(org_id uuid) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
        SELECT EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_id = org_id
              AND user_id = auth_user_id()
        )
    $$;

-- ---- app_users: self-read only ---------------------------------
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'app_users' AND policyname = 'app_users_self_read') THEN
    CREATE POLICY app_users_self_read ON app_users FOR SELECT
        USING (id = auth_user_id());
  END IF;
END $$;

-- ---- documents: org-scoped all ---------------------------------
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'documents' AND policyname = 'documents_org_member_all') THEN
    CREATE POLICY documents_org_member_all ON documents FOR ALL
        USING (is_org_member(organization_id))
        WITH CHECK (is_org_member(organization_id));
  END IF;
END $$;

-- ---- workflow_rules: org-scoped all ----------------------------
ALTER TABLE workflow_rules ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workflow_rules' AND policyname = 'workflow_rules_org_member_all') THEN
    CREATE POLICY workflow_rules_org_member_all ON workflow_rules FOR ALL
        USING (is_org_member(organization_id))
        WITH CHECK (is_org_member(organization_id));
  END IF;
END $$;

-- ---- audit_logs: org-scoped read only --------------------------
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'audit_logs' AND policyname = 'audit_logs_org_member_read') THEN
    CREATE POLICY audit_logs_org_member_read ON audit_logs FOR SELECT
        USING (is_org_member(organization_id));
  END IF;
END $$;

-- ---- task_items: org-scoped all --------------------------------
ALTER TABLE task_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'task_items' AND policyname = 'task_items_org_member_all') THEN
    CREATE POLICY task_items_org_member_all ON task_items FOR ALL
        USING (is_org_member(organization_id))
        WITH CHECK (is_org_member(organization_id));
  END IF;
END $$;

-- ---- org_subscriptions: org-scoped read only -------------------
ALTER TABLE org_subscriptions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'org_subscriptions' AND policyname = 'org_subscriptions_org_member_read') THEN
    CREATE POLICY org_subscriptions_org_member_read ON org_subscriptions FOR SELECT
        USING (is_org_member(organization_id));
  END IF;
END $$;

-- ---- platform_admins: self-read only ---------------------------
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'platform_admins' AND policyname = 'platform_admins_self_read') THEN
    CREATE POLICY platform_admins_self_read ON platform_admins FOR SELECT
        USING (user_id = auth_user_id());
  END IF;
END $$;

-- ---- subscription_plans: public catalog (read-all) -------------
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'subscription_plans' AND policyname = 'subscription_plans_read_all') THEN
    CREATE POLICY subscription_plans_read_all ON subscription_plans FOR SELECT
        USING (true);
  END IF;
END $$;

-- ---- tenant_access_tokens: backend-only, deny all via RLS -----
ALTER TABLE tenant_access_tokens ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tenant_access_tokens' AND policyname = 'tenant_access_tokens_deny_all') THEN
    CREATE POLICY tenant_access_tokens_deny_all ON tenant_access_tokens FOR ALL
        USING (false);
  END IF;
END $$;
