-- Backfill marketplace listing totals and add filter indexes.
-- Keeps /public/listings monthly/move-in filtering index-friendly.

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS total_move_in numeric(12, 2) NOT NULL DEFAULT 0 CHECK (total_move_in >= 0),
  ADD COLUMN IF NOT EXISTS monthly_recurring_total numeric(12, 2) NOT NULL DEFAULT 0 CHECK (monthly_recurring_total >= 0);

WITH listing_totals AS (
  SELECT
    listing_id,
    ROUND(COALESCE(SUM(GREATEST(amount, 0)), 0)::numeric, 2) AS total_move_in,
    ROUND(
      COALESCE(
        SUM(
          CASE
            WHEN is_recurring OR fee_type = 'monthly_rent' THEN GREATEST(amount, 0)
            ELSE 0
          END
        ),
        0
      )::numeric,
      2
    ) AS monthly_recurring_total
  FROM listing_fee_lines
  GROUP BY listing_id
)
UPDATE listings l
SET
  total_move_in = lt.total_move_in,
  monthly_recurring_total = lt.monthly_recurring_total
FROM listing_totals lt
WHERE l.id = lt.listing_id
  AND (
    l.total_move_in IS DISTINCT FROM lt.total_move_in
    OR l.monthly_recurring_total IS DISTINCT FROM lt.monthly_recurring_total
  );

UPDATE listings l
SET
  total_move_in = 0,
  monthly_recurring_total = 0
WHERE NOT EXISTS (
  SELECT 1
  FROM listing_fee_lines lf
  WHERE lf.listing_id = l.id
)
AND (l.total_move_in <> 0 OR l.monthly_recurring_total <> 0);

CREATE INDEX IF NOT EXISTS idx_listings_public_monthly_recurring
  ON listings (monthly_recurring_total, published_at DESC)
  WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_listings_public_total_move_in
  ON listings (total_move_in, published_at DESC)
  WHERE is_published = true;
