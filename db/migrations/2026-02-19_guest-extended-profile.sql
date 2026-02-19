-- Guest extended profile columns for background checks & legal compliance
ALTER TABLE guests ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS emergency_contact_name text;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS emergency_contact_phone text;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS occupation text;
