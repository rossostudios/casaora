-- Puerta Abierta database schema
-- PostgreSQL 15+ compatible
-- Works on Supabase and Neon (RLS block is Supabase-oriented and optional on Neon).

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS citext;

-- ---------- Enums ----------

CREATE TYPE member_role AS ENUM (
  'owner_admin',
  'operator',
  'cleaner',
  'accountant',
  'viewer'
);

CREATE TYPE property_status AS ENUM (
  'active',
  'inactive'
);

CREATE TYPE channel_kind AS ENUM (
  'airbnb',
  'bookingcom',
  'direct',
  'vrbo',
  'other'
);

CREATE TYPE reservation_status AS ENUM (
  'pending',
  'confirmed',
  'checked_in',
  'checked_out',
  'cancelled',
  'no_show'
);

CREATE TYPE task_type AS ENUM (
  'cleaning',
  'maintenance',
  'check_in',
  'check_out',
  'inspection',
  'custom'
);

CREATE TYPE task_status AS ENUM (
  'todo',
  'in_progress',
  'done',
  'cancelled'
);

CREATE TYPE priority_level AS ENUM (
  'low',
  'medium',
  'high',
  'urgent'
);

CREATE TYPE expense_category AS ENUM (
  'cleaning',
  'maintenance',
  'utilities',
  'supplies',
  'platform_fee',
  'tax',
  'staff',
  'other'
);

CREATE TYPE payment_method AS ENUM (
  'bank_transfer',
  'cash',
  'card',
  'qr',
  'other'
);

CREATE TYPE statement_status AS ENUM (
  'draft',
  'finalized',
  'sent',
  'paid'
);

CREATE TYPE message_channel AS ENUM (
  'whatsapp',
  'email',
  'sms'
);

CREATE TYPE message_status AS ENUM (
  'queued',
  'sent',
  'failed'
);

-- ---------- Utility functions ----------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Supabase-compatible helper.
-- On Neon/custom auth, replace this function to map to your session auth identity.
CREATE OR REPLACE FUNCTION auth_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

-- ---------- Identity and tenancy ----------

CREATE TABLE app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext NOT NULL UNIQUE,
  full_name text NOT NULL,
  phone_e164 text,
  locale text NOT NULL DEFAULT 'es-PY',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  legal_name text,
  ruc text,
  default_currency char(3) NOT NULL DEFAULT 'PYG' CHECK (default_currency IN ('PYG', 'USD')),
  timezone text NOT NULL DEFAULT 'America/Asuncion',
  country_code char(2) NOT NULL DEFAULT 'PY',
  owner_user_id uuid NOT NULL REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_org_owner_user_id ON organizations(owner_user_id);

CREATE TABLE organization_members (
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  role member_role NOT NULL DEFAULT 'operator',
  is_primary boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

CREATE INDEX idx_org_members_user_id ON organization_members(user_id);

-- Email-based invites (onboarding without UUID sharing)
CREATE TABLE organization_invites (
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

CREATE UNIQUE INDEX idx_org_invites_unique_pending_email
  ON organization_invites(organization_id, email)
  WHERE status = 'pending';

CREATE INDEX idx_org_invites_org_status_created
  ON organization_invites(organization_id, status, created_at DESC);

CREATE OR REPLACE FUNCTION is_org_member(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members om
    WHERE om.organization_id = org_id
      AND om.user_id = auth_user_id()
  );
$$;

-- ---------- Properties and listings ----------

CREATE TABLE properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  status property_status NOT NULL DEFAULT 'active',
  address_line1 text,
  address_line2 text,
  city text NOT NULL DEFAULT 'Asuncion',
  region text,
  postal_code text,
  country_code char(2) NOT NULL DEFAULT 'PY',
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);

CREATE INDEX idx_properties_org_id ON properties(organization_id);
CREATE INDEX idx_properties_status ON properties(organization_id, status);

CREATE TABLE units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  max_guests smallint NOT NULL DEFAULT 2 CHECK (max_guests > 0),
  bedrooms smallint NOT NULL DEFAULT 1 CHECK (bedrooms >= 0),
  bathrooms numeric(4, 1) NOT NULL DEFAULT 1.0 CHECK (bathrooms >= 0),
  square_meters numeric(8, 2),
  check_in_time time NOT NULL DEFAULT '15:00:00',
  check_out_time time NOT NULL DEFAULT '11:00:00',
  default_nightly_rate numeric(12, 2) NOT NULL DEFAULT 0 CHECK (default_nightly_rate >= 0),
  default_cleaning_fee numeric(12, 2) NOT NULL DEFAULT 0 CHECK (default_cleaning_fee >= 0),
  currency char(3) NOT NULL DEFAULT 'PYG' CHECK (currency IN ('PYG', 'USD')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, code)
);

CREATE INDEX idx_units_org_id ON units(organization_id);
CREATE INDEX idx_units_property_id ON units(property_id);

CREATE TABLE channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  kind channel_kind NOT NULL,
  name text NOT NULL,
  external_account_ref text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_channels_org_id ON channels(organization_id);
CREATE INDEX idx_channels_kind ON channels(organization_id, kind);

CREATE TABLE listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  external_listing_id text,
  public_name text NOT NULL,
  ical_import_url text,
  ical_export_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18), 'hex'),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (unit_id, channel_id)
);

CREATE UNIQUE INDEX idx_listings_channel_external
  ON listings(channel_id, external_listing_id)
  WHERE external_listing_id IS NOT NULL;

CREATE INDEX idx_listings_org_id ON listings(organization_id);
CREATE INDEX idx_listings_unit_id ON listings(unit_id);

-- ---------- Guests and reservations ----------

CREATE TABLE guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email citext,
  phone_e164 text,
  document_type text,
  document_number text,
  country_code char(2),
  preferred_language text NOT NULL DEFAULT 'es',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_guests_org_id ON guests(organization_id);
CREATE INDEX idx_guests_email ON guests(organization_id, email);

CREATE TABLE reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES listings(id) ON DELETE SET NULL,
  channel_id uuid REFERENCES channels(id) ON DELETE SET NULL,
  guest_id uuid REFERENCES guests(id) ON DELETE SET NULL,
  external_reservation_id text,
  status reservation_status NOT NULL DEFAULT 'pending',
  source text NOT NULL DEFAULT 'manual',
  check_in_date date NOT NULL,
  check_out_date date NOT NULL,
  period daterange GENERATED ALWAYS AS (daterange(check_in_date, check_out_date, '[)')) STORED,
  adults smallint NOT NULL DEFAULT 1 CHECK (adults >= 0),
  children smallint NOT NULL DEFAULT 0 CHECK (children >= 0),
  infants smallint NOT NULL DEFAULT 0 CHECK (infants >= 0),
  pets smallint NOT NULL DEFAULT 0 CHECK (pets >= 0),
  currency char(3) NOT NULL DEFAULT 'PYG' CHECK (currency IN ('PYG', 'USD')),
  nightly_rate numeric(12, 2) NOT NULL DEFAULT 0 CHECK (nightly_rate >= 0),
  cleaning_fee numeric(12, 2) NOT NULL DEFAULT 0 CHECK (cleaning_fee >= 0),
  tax_amount numeric(12, 2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  extra_fees numeric(12, 2) NOT NULL DEFAULT 0 CHECK (extra_fees >= 0),
  discount_amount numeric(12, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount numeric(12, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  amount_paid numeric(12, 2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  platform_fee numeric(12, 2) NOT NULL DEFAULT 0 CHECK (platform_fee >= 0),
  owner_payout_estimate numeric(12, 2) NOT NULL DEFAULT 0,
  payment_method payment_method,
  payment_reference text,
  cancelled_at timestamptz,
  cancel_reason text,
  notes text,
  created_by_user_id uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (check_out_date > check_in_date)
);

CREATE INDEX idx_reservations_org_id ON reservations(organization_id);
CREATE INDEX idx_reservations_unit_dates ON reservations(unit_id, check_in_date, check_out_date);
CREATE INDEX idx_reservations_status_dates ON reservations(organization_id, status, check_in_date);
CREATE INDEX idx_reservations_guest_id ON reservations(guest_id);
CREATE INDEX idx_reservations_period_gist ON reservations USING gist (unit_id, period);

CREATE UNIQUE INDEX idx_reservations_channel_external
  ON reservations(channel_id, external_reservation_id)
  WHERE external_reservation_id IS NOT NULL AND channel_id IS NOT NULL;

ALTER TABLE reservations
  ADD CONSTRAINT reservations_no_overlap
  EXCLUDE USING gist (unit_id WITH =, period WITH &&)
  WHERE (status IN ('pending', 'confirmed', 'checked_in'));

CREATE TABLE calendar_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'manual',
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  period daterange GENERATED ALWAYS AS (daterange(starts_on, ends_on, '[)')) STORED,
  reason text,
  created_by_user_id uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_on > starts_on)
);

CREATE INDEX idx_calendar_blocks_org_id ON calendar_blocks(organization_id);
CREATE INDEX idx_calendar_blocks_unit_dates ON calendar_blocks(unit_id, starts_on, ends_on);
CREATE INDEX idx_calendar_blocks_period_gist ON calendar_blocks USING gist (unit_id, period);

ALTER TABLE calendar_blocks
  ADD CONSTRAINT calendar_blocks_no_overlap
  EXCLUDE USING gist (unit_id WITH =, period WITH &&);

-- ---------- Task operations ----------

CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES units(id) ON DELETE SET NULL,
  reservation_id uuid REFERENCES reservations(id) ON DELETE SET NULL,
  assigned_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  created_by_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  type task_type NOT NULL DEFAULT 'custom',
  status task_status NOT NULL DEFAULT 'todo',
  priority priority_level NOT NULL DEFAULT 'medium',
  title text NOT NULL,
  description text,
  due_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  completion_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_org_status_due ON tasks(organization_id, status, due_at);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_user_id, status);
CREATE INDEX idx_tasks_reservation ON tasks(reservation_id);

CREATE TABLE task_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 1,
  label text NOT NULL,
  is_required boolean NOT NULL DEFAULT true,
  is_completed boolean NOT NULL DEFAULT false,
  completed_by_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, sort_order)
);

CREATE INDEX idx_task_items_task_id ON task_items(task_id);

-- ---------- Finance ----------

CREATE TABLE expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES units(id) ON DELETE SET NULL,
  reservation_id uuid REFERENCES reservations(id) ON DELETE SET NULL,
  category expense_category NOT NULL DEFAULT 'other',
  vendor_name text,
  expense_date date NOT NULL,
  amount numeric(12, 2) NOT NULL CHECK (amount >= 0),
  currency char(3) NOT NULL DEFAULT 'PYG' CHECK (currency IN ('PYG', 'USD')),
  fx_rate_to_pyg numeric(14, 6),
  payment_method payment_method NOT NULL DEFAULT 'bank_transfer',
  invoice_number text,
  invoice_ruc text,
  receipt_url text,
  notes text,
  created_by_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_org_date ON expenses(organization_id, expense_date);
CREATE INDEX idx_expenses_org_category ON expenses(organization_id, category);
CREATE INDEX idx_expenses_reservation_id ON expenses(reservation_id);

CREATE TABLE owner_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES units(id) ON DELETE SET NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  currency char(3) NOT NULL DEFAULT 'PYG' CHECK (currency IN ('PYG', 'USD')),
  gross_revenue numeric(12, 2) NOT NULL DEFAULT 0,
  platform_fees numeric(12, 2) NOT NULL DEFAULT 0,
  taxes_collected numeric(12, 2) NOT NULL DEFAULT 0,
  operating_expenses numeric(12, 2) NOT NULL DEFAULT 0,
  net_payout numeric(12, 2) NOT NULL DEFAULT 0,
  status statement_status NOT NULL DEFAULT 'draft',
  pdf_url text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (period_end >= period_start)
);

CREATE INDEX idx_owner_statements_org_period
  ON owner_statements(organization_id, period_start, period_end);

-- ---------- Messaging ----------

CREATE TABLE message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_key text NOT NULL,
  name text NOT NULL,
  channel message_channel NOT NULL DEFAULT 'whatsapp',
  language_code text NOT NULL DEFAULT 'es-PY',
  subject text,
  body text NOT NULL,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, template_key, language_code)
);

CREATE INDEX idx_message_templates_org_channel
  ON message_templates(organization_id, channel, is_active);

CREATE TABLE message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  reservation_id uuid REFERENCES reservations(id) ON DELETE SET NULL,
  guest_id uuid REFERENCES guests(id) ON DELETE SET NULL,
  template_id uuid REFERENCES message_templates(id) ON DELETE SET NULL,
  channel message_channel NOT NULL DEFAULT 'whatsapp',
  recipient text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status message_status NOT NULL DEFAULT 'queued',
  scheduled_at timestamptz,
  sent_at timestamptz,
  error_message text,
  provider_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_message_logs_org_status ON message_logs(organization_id, status, created_at);
CREATE INDEX idx_message_logs_recipient ON message_logs(recipient);

-- ---------- Integrations and audit ----------

CREATE TABLE integration_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  provider text NOT NULL,
  event_type text NOT NULL,
  external_event_id text,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'processed', 'failed', 'ignored')),
  error_message text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_integration_events_provider_external
  ON integration_events(provider, external_event_id)
  WHERE external_event_id IS NOT NULL;

CREATE INDEX idx_integration_events_status ON integration_events(status, received_at);

CREATE TABLE audit_logs (
  id bigserial PRIMARY KEY,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_name text NOT NULL,
  entity_id uuid,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_org_created_at ON audit_logs(organization_id, created_at DESC);

-- ---------- Update triggers ----------

CREATE TRIGGER trg_app_users_updated_at
  BEFORE UPDATE ON app_users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_organization_members_updated_at
  BEFORE UPDATE ON organization_members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_organization_invites_updated_at
  BEFORE UPDATE ON organization_invites
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_units_updated_at
  BEFORE UPDATE ON units
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_channels_updated_at
  BEFORE UPDATE ON channels
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_guests_updated_at
  BEFORE UPDATE ON guests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_calendar_blocks_updated_at
  BEFORE UPDATE ON calendar_blocks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_task_items_updated_at
  BEFORE UPDATE ON task_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_owner_statements_updated_at
  BEFORE UPDATE ON owner_statements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_message_templates_updated_at
  BEFORE UPDATE ON message_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_message_logs_updated_at
  BEFORE UPDATE ON message_logs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_integration_events_updated_at
  BEFORE UPDATE ON integration_events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- Optional RLS policies (Supabase-friendly) ----------
-- If you are on Neon and enforcing tenancy in application code, keep RLS disabled
-- or adapt auth_user_id() to your session variable model.

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY organizations_member_read
  ON organizations FOR SELECT
  USING (is_org_member(id));
CREATE POLICY organizations_owner_update
  ON organizations FOR UPDATE
  USING (owner_user_id = auth_user_id())
  WITH CHECK (owner_user_id = auth_user_id());

ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY organization_members_member_read
  ON organization_members FOR SELECT
  USING (is_org_member(organization_id));
CREATE POLICY organization_members_owner_write
  ON organization_members FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth_user_id()
        AND om.role = 'owner_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth_user_id()
        AND om.role = 'owner_admin'
    )
  );

ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;
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

-- Uniform member policies for organization-scoped tables.
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY properties_org_member_all
  ON properties FOR ALL
  USING (is_org_member(organization_id))
  WITH CHECK (is_org_member(organization_id));

CREATE POLICY units_org_member_all
  ON units FOR ALL
  USING (is_org_member(organization_id))
  WITH CHECK (is_org_member(organization_id));

CREATE POLICY channels_org_member_all
  ON channels FOR ALL
  USING (is_org_member(organization_id))
  WITH CHECK (is_org_member(organization_id));

CREATE POLICY listings_org_member_all
  ON listings FOR ALL
  USING (is_org_member(organization_id))
  WITH CHECK (is_org_member(organization_id));

CREATE POLICY guests_org_member_all
  ON guests FOR ALL
  USING (is_org_member(organization_id))
  WITH CHECK (is_org_member(organization_id));

CREATE POLICY reservations_org_member_all
  ON reservations FOR ALL
  USING (is_org_member(organization_id))
  WITH CHECK (is_org_member(organization_id));

CREATE POLICY calendar_blocks_org_member_all
  ON calendar_blocks FOR ALL
  USING (is_org_member(organization_id))
  WITH CHECK (is_org_member(organization_id));

CREATE POLICY tasks_org_member_all
  ON tasks FOR ALL
  USING (is_org_member(organization_id))
  WITH CHECK (is_org_member(organization_id));

CREATE POLICY expenses_org_member_all
  ON expenses FOR ALL
  USING (is_org_member(organization_id))
  WITH CHECK (is_org_member(organization_id));

CREATE POLICY owner_statements_org_member_all
  ON owner_statements FOR ALL
  USING (is_org_member(organization_id))
  WITH CHECK (is_org_member(organization_id));

CREATE POLICY message_templates_org_member_all
  ON message_templates FOR ALL
  USING (is_org_member(organization_id))
  WITH CHECK (is_org_member(organization_id));

CREATE POLICY message_logs_org_member_all
  ON message_logs FOR ALL
  USING (is_org_member(organization_id))
  WITH CHECK (is_org_member(organization_id));
