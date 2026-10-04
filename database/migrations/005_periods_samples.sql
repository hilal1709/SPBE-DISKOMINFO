-- Data contoh yang bisa dihapus, kode probis unik per periode (versioning arsitektur), dan validasi rentang periode.
ALTER TABLE process_businesses ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;
ALTER TABLE process_businesses DROP CONSTRAINT IF EXISTS process_businesses_code_key;
DO $$ BEGIN
  ALTER TABLE process_businesses ADD CONSTRAINT process_businesses_code_period_key UNIQUE (code, period_id);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE architecture_periods ADD CONSTRAINT architecture_periods_span CHECK (end_year >= start_year);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS process_businesses_sample_idx ON process_businesses (is_sample) WHERE is_sample;
