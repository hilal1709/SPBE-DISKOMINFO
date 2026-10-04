-- Modul CMS Proses Bisnis: kolom sesuai template "Domain Arsitektur Proses Bisnis.xlsx", alur verifikasi, riwayat.
DO $$ BEGIN CREATE TYPE probis_status AS ENUM ('new','upgrade','as_is'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TYPE submission_status ADD VALUE IF NOT EXISTS 'verified' AFTER 'submitted';

ALTER TABLE process_businesses
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS rab_id uuid REFERENCES rab_references(id),
  ADD COLUMN IF NOT EXISTS rab_l4 text,
  ADD COLUMN IF NOT EXISTS rab_l5 text,
  ADD COLUMN IF NOT EXISTS strategic_goal text,
  ADD COLUMN IF NOT EXISTS iku text,
  ADD COLUMN IF NOT EXISTS iku_target text,
  ADD COLUMN IF NOT EXISTS iku_realization text,
  ADD COLUMN IF NOT EXISTS probis_status probis_status NOT NULL DEFAULT 'as_is',
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE process_businesses ALTER COLUMN status SET DEFAULT 'draft';
CREATE INDEX IF NOT EXISTS process_businesses_status_idx ON process_businesses (status);
CREATE INDEX IF NOT EXISTS process_businesses_opd_idx ON process_businesses (opd_id);

CREATE TABLE IF NOT EXISTS probis_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_business_id uuid NOT NULL REFERENCES process_businesses(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES users(id),
  actor_name text,
  from_status submission_status,
  to_status submission_status NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS probis_reviews_pb_idx ON probis_reviews (process_business_id);

INSERT INTO architecture_periods (name,start_year,end_year,is_active) VALUES ('2020–2024',2020,2024,false) ON CONFLICT (name) DO NOTHING;
