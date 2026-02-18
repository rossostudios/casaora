-- Notification Center + Rules Engine hardening
-- - Adds per-user in-app notification storage
-- - Adds idempotent notification rule dispatch tracking
-- - Aligns message_logs schema drift (direction, retry_count)
-- - Extends notification trigger enum for event-driven notifications

-- ============================================================
-- 1) Extend notification trigger enum
-- ============================================================
DO $$
BEGIN
  BEGIN ALTER TYPE notification_trigger_event ADD VALUE IF NOT EXISTS 'maintenance_acknowledged'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE notification_trigger_event ADD VALUE IF NOT EXISTS 'maintenance_scheduled'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE notification_trigger_event ADD VALUE IF NOT EXISTS 'maintenance_completed'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE notification_trigger_event ADD VALUE IF NOT EXISTS 'lease_expiring_60d'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE notification_trigger_event ADD VALUE IF NOT EXISTS 'lease_renewal_offered'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE notification_trigger_event ADD VALUE IF NOT EXISTS 'lease_renewal_accepted'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE notification_trigger_event ADD VALUE IF NOT EXISTS 'collection_overdue'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE notification_trigger_event ADD VALUE IF NOT EXISTS 'collection_escalated'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE notification_trigger_event ADD VALUE IF NOT EXISTS 'guest_message_received'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE notification_trigger_event ADD VALUE IF NOT EXISTS 'message_send_failed'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE notification_trigger_event ADD VALUE IF NOT EXISTS 'application_status_changed'; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ============================================================
-- 2) message_logs drift alignment
-- ============================================================
ALTER TABLE message_logs
  ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'outbound',
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'message_logs_direction_check'
  ) THEN
    ALTER TABLE message_logs
      ADD CONSTRAINT message_logs_direction_check
      CHECK (direction IN ('inbound', 'outbound'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_message_logs_direction
  ON message_logs (direction, created_at DESC);

-- ============================================================
-- 3) Notification center tables
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  category text NOT NULL,
  severity text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  link_path text,
  source_table text,
  source_id text,
  actor_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_events_dedupe_key
  ON notification_events(dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_events_org_occurred
  ON notification_events(organization_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_events_event_type_occurred
  ON notification_events(event_type, occurred_at DESC);

CREATE TABLE IF NOT EXISTS user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES notification_events(id) ON DELETE CASCADE,
  recipient_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  read_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, recipient_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_recipient_org_created
  ON user_notifications(recipient_user_id, organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_unread
  ON user_notifications(recipient_user_id, organization_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS notification_rule_dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_rule_id uuid NOT NULL REFERENCES notification_rules(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES notification_events(id) ON DELETE CASCADE,
  recipient text NOT NULL,
  channel message_channel NOT NULL,
  message_log_id uuid REFERENCES message_logs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (notification_rule_id, event_id, recipient, channel)
);

CREATE INDEX IF NOT EXISTS idx_notification_rule_dispatches_rule_event
  ON notification_rule_dispatches(notification_rule_id, event_id);

-- ============================================================
-- 4) RLS + policies
-- ============================================================
ALTER TABLE notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_rule_dispatches ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notification_events'
      AND policyname = 'notification_events_org_member_all'
  ) THEN
    CREATE POLICY notification_events_org_member_all
      ON notification_events FOR ALL
      USING (is_org_member(organization_id))
      WITH CHECK (is_org_member(organization_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_notifications'
      AND policyname = 'user_notifications_recipient_all'
  ) THEN
    CREATE POLICY user_notifications_recipient_all
      ON user_notifications FOR ALL
      USING (
        is_org_member(organization_id)
        AND recipient_user_id = auth_user_id()
      )
      WITH CHECK (
        is_org_member(organization_id)
        AND recipient_user_id = auth_user_id()
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notification_rule_dispatches'
      AND policyname = 'notification_rule_dispatches_org_member_all'
  ) THEN
    CREATE POLICY notification_rule_dispatches_org_member_all
      ON notification_rule_dispatches FOR ALL
      USING (
        EXISTS (
          SELECT 1
          FROM notification_rules nr
          WHERE nr.id = notification_rule_dispatches.notification_rule_id
            AND is_org_member(nr.organization_id)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM notification_rules nr
          WHERE nr.id = notification_rule_dispatches.notification_rule_id
            AND is_org_member(nr.organization_id)
        )
      );
  END IF;
END $$;
