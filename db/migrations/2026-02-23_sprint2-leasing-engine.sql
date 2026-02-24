-- Sprint 2: Conversational Leasing Engine
-- Adds leasing conversations, property matching scores, and tour schedules.

-- ═══════════════════════════════════════════════════════════════════════
-- 1. Leasing Conversations — multi-turn conversations per application
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS leasing_conversations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  application_id    uuid REFERENCES application_submissions(id) ON DELETE SET NULL,
  channel           text NOT NULL DEFAULT 'web'
                      CHECK (channel IN ('web', 'whatsapp', 'sms', 'email', 'phone')),
  status            text NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'qualified', 'stalled', 'converted', 'closed')),
  funnel_stage      text DEFAULT 'inquiry'
                      CHECK (funnel_stage IN ('inquiry', 'qualification', 'screening', 'tour_scheduled', 'offer_sent', 'negotiation', 'signed', 'lost')),
  lead_score        double precision,
  messages          jsonb NOT NULL DEFAULT '[]',
  message_count     integer NOT NULL DEFAULT 0,
  last_message_at   timestamptz,
  last_message_role text,
  stalled_at        timestamptz,
  converted_at      timestamptz,
  metadata          jsonb DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leasing_conversations_org
  ON leasing_conversations(org_id, status);
CREATE INDEX IF NOT EXISTS idx_leasing_conversations_application
  ON leasing_conversations(application_id)
  WHERE application_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leasing_conversations_stalled
  ON leasing_conversations(org_id, stalled_at)
  WHERE status = 'stalled';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_leasing_conversations_updated_at'
  ) THEN
    CREATE TRIGGER trg_leasing_conversations_updated_at
      BEFORE UPDATE ON leasing_conversations
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

ALTER TABLE leasing_conversations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'leasing_conversations'
      AND policyname = 'leasing_conversations_org_member_all'
  ) THEN
    CREATE POLICY leasing_conversations_org_member_all
      ON leasing_conversations FOR ALL
      USING (is_org_member(org_id))
      WITH CHECK (is_org_member(org_id));
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- 2. Property Matching Scores — unit matching results per application
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS property_matching_scores (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  application_id    uuid NOT NULL REFERENCES application_submissions(id) ON DELETE CASCADE,
  unit_id           uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  overall_score     double precision NOT NULL DEFAULT 0,
  budget_score      double precision DEFAULT 0,
  location_score    double precision DEFAULT 0,
  amenity_score     double precision DEFAULT 0,
  size_score        double precision DEFAULT 0,
  scoring_details   jsonb DEFAULT '{}',
  rank              integer,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_matching_scores_app
  ON property_matching_scores(application_id, overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_property_matching_scores_org
  ON property_matching_scores(org_id);

ALTER TABLE property_matching_scores ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'property_matching_scores'
      AND policyname = 'property_matching_scores_org_member_all'
  ) THEN
    CREATE POLICY property_matching_scores_org_member_all
      ON property_matching_scores FOR ALL
      USING (is_org_member(org_id))
      WITH CHECK (is_org_member(org_id));
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- 3. Tour Schedules — viewing appointments with reminders
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tour_schedules (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  application_id    uuid REFERENCES application_submissions(id) ON DELETE SET NULL,
  unit_id           uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  property_id       uuid REFERENCES properties(id) ON DELETE SET NULL,
  scheduled_at      timestamptz NOT NULL,
  duration_minutes  integer NOT NULL DEFAULT 30,
  status            text NOT NULL DEFAULT 'scheduled'
                      CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
  contact_name      text,
  contact_phone     text,
  contact_email     text,
  assigned_staff_id uuid,
  notes             text,
  reminder_sent_at  timestamptz,
  confirmed_at      timestamptz,
  completed_at      timestamptz,
  feedback          jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tour_schedules_org
  ON tour_schedules(org_id, status);
CREATE INDEX IF NOT EXISTS idx_tour_schedules_upcoming
  ON tour_schedules(scheduled_at)
  WHERE status IN ('scheduled', 'confirmed');
CREATE INDEX IF NOT EXISTS idx_tour_schedules_application
  ON tour_schedules(application_id)
  WHERE application_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_tour_schedules_updated_at'
  ) THEN
    CREATE TRIGGER trg_tour_schedules_updated_at
      BEFORE UPDATE ON tour_schedules
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

ALTER TABLE tour_schedules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tour_schedules'
      AND policyname = 'tour_schedules_org_member_all'
  ) THEN
    CREATE POLICY tour_schedules_org_member_all
      ON tour_schedules FOR ALL
      USING (is_org_member(org_id))
      WITH CHECK (is_org_member(org_id));
  END IF;
END $$;
