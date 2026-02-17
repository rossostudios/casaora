-- Phase 3.2: Cancellation Policies & Deposit Tracking
CREATE TABLE IF NOT EXISTS cancellation_policies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    refund_percent numeric(5, 2) NOT NULL DEFAULT 100,
    cutoff_hours integer NOT NULL DEFAULT 48,
    is_default boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reservations ADD COLUMN IF NOT EXISTS cancellation_policy_id uuid REFERENCES cancellation_policies(id) ON DELETE SET NULL;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS deposit_amount numeric(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS deposit_status text NOT NULL DEFAULT 'none';
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS deposit_refunded_at timestamptz;

-- Phase 3.3: Calendar Blocks Recurrence
ALTER TABLE calendar_blocks ADD COLUMN IF NOT EXISTS recurrence_rule text;
ALTER TABLE calendar_blocks ADD COLUMN IF NOT EXISTS recurrence_end_date date;
