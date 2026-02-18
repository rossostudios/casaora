-- Performance tuning indexes for high-traffic Casaora flows
-- 2026-02-18

-- Public marketplace listing retrieval and filtering
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_listings_public_published_at
  ON listings (published_at DESC)
  WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_listings_public_city
  ON listings (lower(city))
  WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_listings_public_property_type
  ON listings (lower(property_type))
  WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_listings_public_neighborhood
  ON listings (lower(neighborhood))
  WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_listings_public_furnished
  ON listings (furnished, published_at DESC)
  WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_listings_public_text_trgm
  ON listings
  USING gin (
    (
      coalesce(title, '') || ' ' ||
      coalesce(summary, '') || ' ' ||
      coalesce(neighborhood, '') || ' ' ||
      coalesce(description, '')
    ) gin_trgm_ops
  )
  WHERE is_published = true;

-- Application pipeline board filters
CREATE INDEX IF NOT EXISTS idx_application_submissions_org_assigned_created
  ON application_submissions (organization_id, assigned_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_application_submissions_org_listing_created
  ON application_submissions (organization_id, listing_id, created_at DESC);

-- Leases module filters and enrichment
CREATE INDEX IF NOT EXISTS idx_leases_org_property_created
  ON leases (organization_id, property_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_leases_org_unit_created
  ON leases (organization_id, unit_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_collection_records_lease_created
  ON collection_records (lease_id, created_at DESC);

-- Owner statements and breakdown computation
CREATE INDEX IF NOT EXISTS idx_owner_statements_org_status_period
  ON owner_statements (organization_id, status, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_owner_statements_org_property_period
  ON owner_statements (organization_id, property_id, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_owner_statements_org_unit_period
  ON owner_statements (organization_id, unit_id, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_reservations_org_status_checkout
  ON reservations (organization_id, status, check_out_date);

CREATE INDEX IF NOT EXISTS idx_reservations_org_unit_status_dates
  ON reservations (organization_id, unit_id, status, check_in_date, check_out_date);

CREATE INDEX IF NOT EXISTS idx_expenses_org_property_date
  ON expenses (organization_id, property_id, expense_date);

CREATE INDEX IF NOT EXISTS idx_expenses_org_unit_date
  ON expenses (organization_id, unit_id, expense_date);

CREATE INDEX IF NOT EXISTS idx_lease_charges_org_lease_type_date
  ON lease_charges (organization_id, lease_id, charge_type, charge_date);

CREATE INDEX IF NOT EXISTS idx_collection_records_org_lease_status_paid
  ON collection_records (organization_id, lease_id, status, paid_at DESC);

CREATE INDEX IF NOT EXISTS idx_collection_records_paid_lease_paidat
  ON collection_records (lease_id, paid_at DESC)
  WHERE status = 'paid';

-- Covering indexes for foreign keys reported by Supabase Advisor
CREATE INDEX IF NOT EXISTS idx_cancellation_policies_org
  ON cancellation_policies (organization_id);

CREATE INDEX IF NOT EXISTS idx_expenses_approved_by
  ON expenses (approved_by);

CREATE INDEX IF NOT EXISTS idx_owner_access_tokens_org
  ON owner_access_tokens (organization_id);

CREATE INDEX IF NOT EXISTS idx_owner_statements_approved_by
  ON owner_statements (approved_by);

CREATE INDEX IF NOT EXISTS idx_reservations_cancellation_policy
  ON reservations (cancellation_policy_id);

CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_org
  ON sequence_enrollments (organization_id);

CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_sequence
  ON sequence_enrollments (sequence_id);

CREATE INDEX IF NOT EXISTS idx_sequence_steps_template
  ON sequence_steps (template_id);

-- Remove duplicate index reported by Supabase Advisor on integrations(org_id)
DROP INDEX IF EXISTS idx_listings_org_id;

-- RLS initplan optimization: evaluate auth helper once per statement.
DROP POLICY IF EXISTS platform_admins_self_read ON platform_admins;
CREATE POLICY platform_admins_self_read ON platform_admins FOR SELECT
  USING (user_id = (SELECT auth_user_id()));

DROP POLICY IF EXISTS organization_members_owner_update ON organization_members;
CREATE POLICY organization_members_owner_update ON organization_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = (SELECT auth_user_id())
        AND om.role = 'owner_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = (SELECT auth_user_id())
        AND om.role = 'owner_admin'
    )
  );
