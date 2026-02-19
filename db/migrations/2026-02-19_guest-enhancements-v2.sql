-- Guest enhancements v2: document expiry, nationality, background checks, accompanying guests

-- 1. Document expiry
ALTER TABLE guests ADD COLUMN IF NOT EXISTS document_expiry date;

-- 2. Nationality (citizenship, separate from country_code which is residence)
ALTER TABLE guests ADD COLUMN IF NOT EXISTS nationality char(2);

-- 3. Background check workflow
ALTER TABLE guests ADD COLUMN IF NOT EXISTS background_check_status text NOT NULL DEFAULT 'not_requested'
  CHECK (background_check_status IN ('not_requested', 'requested', 'cleared', 'failed', 'expired'));
ALTER TABLE guests ADD COLUMN IF NOT EXISTS background_check_date date;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS background_check_notes text;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS background_check_report_url text;

-- 4. Accompanying guests
CREATE TABLE IF NOT EXISTS reservation_guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'accompanying',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reservation_id, guest_id)
);
ALTER TABLE reservation_guests ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_reservation_guests_reservation ON reservation_guests(reservation_id);
CREATE INDEX IF NOT EXISTS idx_reservation_guests_guest ON reservation_guests(guest_id);

-- RLS policies for reservation_guests
CREATE POLICY reservation_guests_select ON reservation_guests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reservations r
      JOIN organization_members om ON om.organization_id = r.organization_id
      WHERE r.id = reservation_guests.reservation_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY reservation_guests_insert ON reservation_guests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reservations r
      JOIN organization_members om ON om.organization_id = r.organization_id
      WHERE r.id = reservation_guests.reservation_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner_admin', 'operator')
    )
  );

CREATE POLICY reservation_guests_delete ON reservation_guests FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM reservations r
      JOIN organization_members om ON om.organization_id = r.organization_id
      WHERE r.id = reservation_guests.reservation_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner_admin', 'operator')
    )
  );
