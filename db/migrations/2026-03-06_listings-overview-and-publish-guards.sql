CREATE INDEX IF NOT EXISTS idx_listings_org_property
  ON listings(organization_id, property_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_listings_org_unit
  ON listings(organization_id, unit_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_listings_org_updated
  ON listings(organization_id, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_listings_one_published_per_unit
  ON listings(organization_id, unit_id)
  WHERE unit_id IS NOT NULL AND is_published = true;
