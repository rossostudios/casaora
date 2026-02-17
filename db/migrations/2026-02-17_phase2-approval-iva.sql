-- Phase 2.1: Expenses Approval Workflow
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES app_users(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- Phase 2.2: Expenses IVA Auto-Calculation
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS iva_applicable boolean NOT NULL DEFAULT false;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS iva_amount numeric(12, 2) NOT NULL DEFAULT 0;

-- Phase 2.3: Owner Statements Approval Before Finalize
ALTER TABLE owner_statements ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'none';
ALTER TABLE owner_statements ADD COLUMN IF NOT EXISTS approval_requested_at timestamptz;
ALTER TABLE owner_statements ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES app_users(id) ON DELETE SET NULL;
ALTER TABLE owner_statements ADD COLUMN IF NOT EXISTS approved_at timestamptz;
