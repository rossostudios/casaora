-- Sprint 7: Voice Agent & Telephony
-- Adds voice interaction tracking and per-org voice configuration.

-- ═══════════════════════════════════════════════════════════════════════
-- 1. Voice Interactions — transcripts, emotion logs, recordings
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS voice_interactions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  caller_phone      text,
  caller_name       text,
  caller_user_id    uuid REFERENCES app_users(id) ON DELETE SET NULL,
  direction         text DEFAULT 'inbound'
                      CHECK (direction IN ('inbound', 'outbound')),
  status            text DEFAULT 'in_progress'
                      CHECK (status IN ('in_progress', 'completed', 'missed', 'failed')),
  duration_seconds  integer DEFAULT 0,
  language          text DEFAULT 'es',
  transcript        jsonb DEFAULT '[]'::jsonb,
  emotion_log       jsonb DEFAULT '[]'::jsonb,
  summary           text,
  actions_taken     jsonb DEFAULT '[]'::jsonb,
  recording_url     text,
  twilio_call_sid   text,
  elevenlabs_session_id text,
  metadata          jsonb DEFAULT '{}',
  started_at        timestamptz NOT NULL DEFAULT now(),
  ended_at          timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_interactions_org
  ON voice_interactions(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_voice_interactions_phone
  ON voice_interactions(caller_phone)
  WHERE caller_phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_voice_interactions_date
  ON voice_interactions(organization_id, started_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_voice_interactions_updated_at'
  ) THEN
    CREATE TRIGGER trg_voice_interactions_updated_at
      BEFORE UPDATE ON voice_interactions
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

ALTER TABLE voice_interactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'voice_interactions'
      AND policyname = 'voice_interactions_org_member_all'
  ) THEN
    CREATE POLICY voice_interactions_org_member_all
      ON voice_interactions FOR ALL
      USING (is_org_member(organization_id))
      WITH CHECK (is_org_member(organization_id));
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- 2. Voice Agent Config — per-org voice settings
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS voice_agent_config (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  is_enabled        boolean DEFAULT false,
  phone_number      text,
  greeting_message  text DEFAULT 'Hola, gracias por llamar. ¿En qué puedo ayudarte?',
  voice_id          text DEFAULT 'rachel',
  language          text DEFAULT 'es',
  elevenlabs_agent_id text,
  twilio_phone_sid  text,
  max_call_duration_seconds integer DEFAULT 300,
  transfer_on_escalation boolean DEFAULT true,
  transfer_number   text,
  business_hours    jsonb DEFAULT '{"start": "08:00", "end": "20:00", "timezone": "America/Asuncion"}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_voice_agent_config_updated_at'
  ) THEN
    CREATE TRIGGER trg_voice_agent_config_updated_at
      BEFORE UPDATE ON voice_agent_config
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

ALTER TABLE voice_agent_config ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'voice_agent_config'
      AND policyname = 'voice_agent_config_org_member_all'
  ) THEN
    CREATE POLICY voice_agent_config_org_member_all
      ON voice_agent_config FOR ALL
      USING (is_org_member(organization_id))
      WITH CHECK (is_org_member(organization_id));
  END IF;
END $$;
