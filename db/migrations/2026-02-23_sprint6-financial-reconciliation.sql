-- Sprint 6: Cognitive Financial Reconciliation
-- Adds bank transactions, reconciliation runs, and configurable matching rules.

-- ═══════════════════════════════════════════════════════════════════════
-- 1. Bank Transactions — imported from CSV / Belvo API
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS bank_transactions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  external_id       text,
  bank_name         text,
  account_number    text,
  transaction_date  date NOT NULL,
  description       text NOT NULL DEFAULT '',
  amount            double precision NOT NULL,
  currency          text DEFAULT 'PYG',
  direction         text DEFAULT 'credit'
                      CHECK (direction IN ('credit', 'debit')),
  reference         text,
  counterparty_name text,
  raw_data          jsonb,
  -- Matching fields
  match_status      text DEFAULT 'unmatched'
                      CHECK (match_status IN ('unmatched', 'matched', 'partial', 'exception', 'ignored')),
  match_confidence  double precision DEFAULT 0
                      CHECK (match_confidence >= 0 AND match_confidence <= 1),
  matched_collection_id uuid REFERENCES collection_records(id) ON DELETE SET NULL,
  match_method      text,
  reconciliation_run_id uuid,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_transactions_org
  ON bank_transactions(organization_id, match_status);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date
  ON bank_transactions(organization_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_reference
  ON bank_transactions(reference)
  WHERE reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bank_transactions_collection
  ON bank_transactions(matched_collection_id)
  WHERE matched_collection_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_bank_transactions_updated_at'
  ) THEN
    CREATE TRIGGER trg_bank_transactions_updated_at
      BEFORE UPDATE ON bank_transactions
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bank_transactions'
      AND policyname = 'bank_transactions_org_member_all'
  ) THEN
    CREATE POLICY bank_transactions_org_member_all
      ON bank_transactions FOR ALL
      USING (is_org_member(organization_id))
      WITH CHECK (is_org_member(organization_id));
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- 2. Reconciliation Runs — batch run statistics
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS reconciliation_runs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  run_type          text DEFAULT 'auto'
                      CHECK (run_type IN ('auto', 'manual', 'daily')),
  started_at        timestamptz NOT NULL DEFAULT now(),
  completed_at      timestamptz,
  total_transactions integer DEFAULT 0,
  matched_count     integer DEFAULT 0,
  partial_count     integer DEFAULT 0,
  exception_count   integer DEFAULT 0,
  total_matched_amount double precision DEFAULT 0,
  match_rate        double precision DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_runs_org
  ON reconciliation_runs(organization_id, started_at DESC);

ALTER TABLE reconciliation_runs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reconciliation_runs'
      AND policyname = 'reconciliation_runs_org_member_all'
  ) THEN
    CREATE POLICY reconciliation_runs_org_member_all
      ON reconciliation_runs FOR ALL
      USING (is_org_member(organization_id))
      WITH CHECK (is_org_member(organization_id));
  END IF;
END $$;

-- Add FK from bank_transactions to reconciliation_runs
ALTER TABLE bank_transactions
  ADD CONSTRAINT fk_bank_transactions_run
    FOREIGN KEY (reconciliation_run_id) REFERENCES reconciliation_runs(id) ON DELETE SET NULL;

-- ═══════════════════════════════════════════════════════════════════════
-- 3. Reconciliation Rules — configurable matching rules
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS reconciliation_rules (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              text NOT NULL,
  rule_type         text NOT NULL DEFAULT 'exact_reference'
                      CHECK (rule_type IN ('exact_reference', 'amount_date', 'fuzzy_name', 'custom')),
  priority          integer DEFAULT 10,
  is_active         boolean DEFAULT true,
  config            jsonb DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_rules_org
  ON reconciliation_rules(organization_id, is_active, priority);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_reconciliation_rules_updated_at'
  ) THEN
    CREATE TRIGGER trg_reconciliation_rules_updated_at
      BEFORE UPDATE ON reconciliation_rules
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

ALTER TABLE reconciliation_rules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reconciliation_rules'
      AND policyname = 'reconciliation_rules_org_member_all'
  ) THEN
    CREATE POLICY reconciliation_rules_org_member_all
      ON reconciliation_rules FOR ALL
      USING (is_org_member(organization_id))
      WITH CHECK (is_org_member(organization_id));
  END IF;
END $$;
