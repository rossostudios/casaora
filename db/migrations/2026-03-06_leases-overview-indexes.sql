ALTER TABLE leases
  ADD COLUMN IF NOT EXISTS parent_lease_id uuid REFERENCES leases(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_renewal boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS renewal_status text
    CHECK (renewal_status IS NULL OR renewal_status IN (
      'pending', 'offered', 'accepted', 'rejected', 'expired'
    )),
  ADD COLUMN IF NOT EXISTS renewal_offered_at timestamptz,
  ADD COLUMN IF NOT EXISTS renewal_decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS renewal_offered_rent numeric(12, 2),
  ADD COLUMN IF NOT EXISTS renewal_notes text;

CREATE INDEX IF NOT EXISTS idx_leases_parent
  ON leases(parent_lease_id)
  WHERE parent_lease_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leases_renewal_status
  ON leases(renewal_status)
  WHERE renewal_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leases_org_ends_active
  ON leases(organization_id, ends_on)
  WHERE lease_status IN ('active', 'delinquent') AND ends_on IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leases_org_renewal_ends
  ON leases(organization_id, renewal_status, ends_on)
  WHERE renewal_status IS NOT NULL;
