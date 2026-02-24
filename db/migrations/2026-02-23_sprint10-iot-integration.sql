-- Sprint 10: IoT & Smart Lock Integration
-- Device registry, sensor events, and time-limited access codes.

-- ═══════════════════════════════════════════════════════════════════════
-- 1. IoT Devices — device registry per property/unit
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS iot_devices (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id       uuid REFERENCES properties(id) ON DELETE SET NULL,
  unit_id           uuid REFERENCES units(id) ON DELETE SET NULL,
  device_type       text NOT NULL DEFAULT 'smart_lock'
                      CHECK (device_type IN ('smart_lock', 'temperature', 'humidity',
                                              'motion', 'door_sensor', 'smoke', 'water_leak',
                                              'energy_meter', 'camera', 'other')),
  device_name       text NOT NULL,
  manufacturer      text,
  model             text,
  serial_number     text,
  external_id       text,
  status            text NOT NULL DEFAULT 'online'
                      CHECK (status IN ('online', 'offline', 'low_battery', 'error')),
  battery_level     integer,
  last_seen_at      timestamptz,
  firmware_version  text,
  configuration     jsonb DEFAULT '{}',
  metadata          jsonb DEFAULT '{}',
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_iot_devices_org
  ON iot_devices(organization_id, device_type);
CREATE INDEX IF NOT EXISTS idx_iot_devices_unit
  ON iot_devices(unit_id) WHERE unit_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_iot_devices_updated_at'
  ) THEN
    CREATE TRIGGER trg_iot_devices_updated_at
      BEFORE UPDATE ON iot_devices
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

ALTER TABLE iot_devices ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'iot_devices'
      AND policyname = 'iot_devices_org_member_all'
  ) THEN
    CREATE POLICY iot_devices_org_member_all
      ON iot_devices FOR ALL
      USING (is_org_member(organization_id))
      WITH CHECK (is_org_member(organization_id));
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- 2. IoT Events — sensor event stream
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS iot_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  device_id         uuid NOT NULL REFERENCES iot_devices(id) ON DELETE CASCADE,
  event_type        text NOT NULL DEFAULT 'reading'
                      CHECK (event_type IN ('reading', 'alert', 'status_change',
                                             'lock_action', 'battery_low', 'offline')),
  severity          text DEFAULT 'info'
                      CHECK (severity IN ('info', 'warning', 'critical')),
  value             double precision,
  unit_of_measure   text,
  description       text,
  acknowledged      boolean NOT NULL DEFAULT false,
  acknowledged_by   uuid REFERENCES app_users(id) ON DELETE SET NULL,
  metadata          jsonb DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_iot_events_device
  ON iot_events(device_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_iot_events_org_alerts
  ON iot_events(organization_id, event_type, created_at DESC)
  WHERE event_type = 'alert';

ALTER TABLE iot_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'iot_events'
      AND policyname = 'iot_events_org_member_all'
  ) THEN
    CREATE POLICY iot_events_org_member_all
      ON iot_events FOR ALL
      USING (is_org_member(organization_id))
      WITH CHECK (is_org_member(organization_id));
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- 3. Access Codes — time-limited codes per reservation/lease
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS access_codes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  device_id         uuid REFERENCES iot_devices(id) ON DELETE SET NULL,
  unit_id           uuid REFERENCES units(id) ON DELETE SET NULL,
  reservation_id    uuid REFERENCES reservations(id) ON DELETE SET NULL,
  lease_id          uuid REFERENCES leases(id) ON DELETE SET NULL,
  code              text NOT NULL,
  code_type         text NOT NULL DEFAULT 'temporary'
                      CHECK (code_type IN ('temporary', 'permanent', 'one_time', 'recurring')),
  status            text NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'expired', 'revoked', 'used')),
  valid_from        timestamptz NOT NULL DEFAULT now(),
  valid_until       timestamptz,
  guest_name        text,
  guest_phone       text,
  sent_via          text CHECK (sent_via IN ('whatsapp', 'sms', 'email', 'manual', NULL)),
  sent_at           timestamptz,
  used_count        integer NOT NULL DEFAULT 0,
  max_uses          integer,
  revoked_at        timestamptz,
  revoked_by        uuid REFERENCES app_users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_access_codes_unit
  ON access_codes(unit_id, status) WHERE unit_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_access_codes_reservation
  ON access_codes(reservation_id) WHERE reservation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_access_codes_active
  ON access_codes(organization_id, status, valid_until)
  WHERE status = 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_access_codes_updated_at'
  ) THEN
    CREATE TRIGGER trg_access_codes_updated_at
      BEFORE UPDATE ON access_codes
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'access_codes'
      AND policyname = 'access_codes_org_member_all'
  ) THEN
    CREATE POLICY access_codes_org_member_all
      ON access_codes FOR ALL
      USING (is_org_member(organization_id))
      WITH CHECK (is_org_member(organization_id));
  END IF;
END $$;
