-- Referensi RAB berversi (mis. per revisi Perpres). Tiap periode arsitektur memakai satu versi,
-- sehingga periode lama tetap menampilkan RAB sebagaimana berlaku saat itu.
CREATE TABLE IF NOT EXISTS rab_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  note text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  based_on uuid REFERENCES rab_versions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

ALTER TABLE rab_references
  ADD COLUMN IF NOT EXISTS version_id uuid REFERENCES rab_versions(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'berlaku',
  ADD COLUMN IF NOT EXISTS origin_id uuid REFERENCES rab_references(id) ON DELETE SET NULL;
DO $$ BEGIN
  ALTER TABLE rab_references ADD CONSTRAINT rab_references_status_check CHECK (status IN ('berlaku', 'tidak_berlaku'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Referensi yang sudah ada menjadi versi awal (terbit).
INSERT INTO rab_versions (name, note, status, published_at)
SELECT 'Perpres 132/2022', 'Referensi awal dari template Domain Arsitektur Proses Bisnis', 'published', now()
WHERE NOT EXISTS (SELECT 1 FROM rab_versions);
UPDATE rab_references SET version_id = (SELECT id FROM rab_versions ORDER BY created_at LIMIT 1) WHERE version_id IS NULL;
ALTER TABLE rab_references ALTER COLUMN version_id SET NOT NULL;

ALTER TABLE rab_references DROP CONSTRAINT IF EXISTS rab_references_code_key;
DO $$ BEGIN
  ALTER TABLE rab_references ADD CONSTRAINT rab_references_version_code_key UNIQUE (version_id, code);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS rab_references_origin_idx ON rab_references (origin_id);
CREATE INDEX IF NOT EXISTS rab_references_parent_idx ON rab_references (parent_id);

ALTER TABLE architecture_periods ADD COLUMN IF NOT EXISTS rab_version_id uuid REFERENCES rab_versions(id);
UPDATE architecture_periods SET rab_version_id = (SELECT id FROM rab_versions ORDER BY created_at LIMIT 1) WHERE rab_version_id IS NULL;

-- Probis yang RAB-nya perlu dipetakan ulang setelah periodenya pindah versi.
ALTER TABLE process_businesses ADD COLUMN IF NOT EXISTS rab_review boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS rab_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES rab_versions(id) ON DELETE CASCADE,
  node_id uuid REFERENCES rab_references(id) ON DELETE SET NULL,
  action text NOT NULL,
  before jsonb,
  after jsonb,
  actor_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rab_changes_version_idx ON rab_changes (version_id, created_at DESC);
