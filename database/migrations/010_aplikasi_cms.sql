-- CMS Domain Aplikasi: referensi RAA berversi (seperti RAB/RAL/RAD), periode memakai versi RAA,
-- dan kolom aplikasi mengikuti template analis "Domain Arsitektur Aplikasi.xlsx" (32 kolom).
-- Pohon RAA dibuat dari lib/aplikasi/raa-reference.json (node scripts/extract-raa.mjs --sql).

CREATE TABLE IF NOT EXISTS raa_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  note text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  based_on uuid REFERENCES raa_versions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

CREATE TABLE IF NOT EXISTS raa_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  level int NOT NULL,
  parent_id uuid REFERENCES raa_references(id),
  version_id uuid NOT NULL REFERENCES raa_versions(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'berlaku' CHECK (status IN ('berlaku', 'tidak_berlaku')),
  origin_id uuid REFERENCES raa_references(id) ON DELETE SET NULL,
  UNIQUE (version_id, code)
);
CREATE INDEX IF NOT EXISTS raa_references_origin_idx ON raa_references (origin_id);
CREATE INDEX IF NOT EXISTS raa_references_parent_idx ON raa_references (parent_id);

-- Versi awal (terbit) berisi seluruh pohon RAA template analis (baru sampai Level 2).
INSERT INTO raa_versions (name, note, status, published_at)
SELECT 'Perpres 132/2022', 'Referensi awal dari template Domain Arsitektur Aplikasi', 'published', now()
WHERE NOT EXISTS (SELECT 1 FROM raa_versions);

INSERT INTO raa_references (code, name, level, parent_id, version_id)
SELECT v.code, v.name, 1, p.id, (SELECT id FROM raa_versions ORDER BY created_at LIMIT 1) FROM (VALUES
('RAA.01','Aplikasi Umum',NULL),
('RAA.02','Aplikasi Khusus',NULL)
) AS v(code, name, parent)
LEFT JOIN raa_references p ON p.code = v.parent AND p.version_id = (SELECT id FROM raa_versions ORDER BY created_at LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM raa_references r WHERE r.code = v.code);

INSERT INTO raa_references (code, name, level, parent_id, version_id)
SELECT v.code, v.name, 2, p.id, (SELECT id FROM raa_versions ORDER BY created_at LIMIT 1) FROM (VALUES
('RAA.01.01','Aplikasi Umum Layanan Publik','RAA.01'),
('RAA.01.02','Aplikasi Umum Administrasi Pemerintahan','RAA.01'),
('RAA.02.01','Aplikasi Khusus Misi Tertentu','RAA.02'),
('RAA.02.02','Aplikasi Khusus Fungsi Tertentu','RAA.02')
) AS v(code, name, parent)
LEFT JOIN raa_references p ON p.code = v.parent AND p.version_id = (SELECT id FROM raa_versions ORDER BY created_at LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM raa_references r WHERE r.code = v.code);

ALTER TABLE architecture_periods ADD COLUMN IF NOT EXISTS raa_version_id uuid REFERENCES raa_versions(id);
UPDATE architecture_periods SET raa_version_id = (SELECT id FROM raa_versions ORDER BY created_at LIMIT 1) WHERE raa_version_id IS NULL;

CREATE TABLE IF NOT EXISTS raa_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES raa_versions(id) ON DELETE CASCADE,
  node_id uuid REFERENCES raa_references(id) ON DELETE SET NULL,
  action text NOT NULL,
  before jsonb,
  after jsonb,
  actor_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS raa_changes_version_idx ON raa_changes (version_id, created_at DESC);

-- Aplikasi: kolom template analis + alur verifikasi (Verifikator Aplikasi Diskominfo → Validator Diskominfo).
-- opd_id = Unit Operasional Teknologi (Perangkat Daerah pemilik isian). Unit pengembang: PD (developer_opd_id)
-- atau nama K/L/penyedia (developer); kepemilikan diturunkan darinya saat dibaca.
-- raa_id = RAA terdalam (L3, atau L2 yang tidak memiliki turunan); raa4_id/raa5_id/raa_l4/raa_l5 mengikuti pola referensi berversi.
-- db_engine = mesin basis data (notulen: "nama basis data" → mesin, mis. PostgreSQL).
-- security = dependensi Keamanan SPBE (7 kunci → daftar teks) sampai modul Keamanan tersedia.
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  function_desc text NOT NULL,
  output text NOT NULL,
  db_engine text,
  basis text NOT NULL CHECK (basis IN ('web', 'desktop', 'mobile', 'cloud')),
  license text NOT NULL CHECK (license IN ('open_source', 'proprietary')),
  language text NOT NULL,
  framework text,
  opd_id uuid NOT NULL REFERENCES opd(id),
  developer_opd_id uuid REFERENCES opd(id),
  developer text,
  input_data text,
  output_data text,
  supplier text,
  customer text,
  cloud text,
  server text,
  splp text,
  jip text,
  period_id uuid NOT NULL REFERENCES architecture_periods(id),
  raa_id uuid REFERENCES raa_references(id),
  raa4_id uuid REFERENCES raa_references(id),
  raa5_id uuid REFERENCES raa_references(id),
  raa_l4 text,
  raa_l5 text,
  raa_review boolean NOT NULL DEFAULT false,
  security jsonb NOT NULL DEFAULT '{}',
  status submission_status NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES users(id),
  submitted_by uuid REFERENCES users(id),
  verified_by uuid REFERENCES users(id),
  approved_by uuid REFERENCES users(id),
  approved_at timestamptz,
  is_sample boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code, period_id),
  CHECK (developer_opd_id IS NOT NULL OR developer IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS applications_status_idx ON applications (status);
CREATE INDEX IF NOT EXISTS applications_opd_idx ON applications (opd_id);
CREATE INDEX IF NOT EXISTS applications_period_idx ON applications (period_id);

-- Aplikasi wajib selaras proses bisnis (notulen): minimal satu tautan, dicek di aplikasi.
CREATE TABLE IF NOT EXISTS application_process_businesses (
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  process_business_id uuid NOT NULL REFERENCES process_businesses(id) ON DELETE CASCADE,
  PRIMARY KEY (application_id, process_business_id)
);
CREATE TABLE IF NOT EXISTS application_services (
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  PRIMARY KEY (application_id, service_id)
);
CREATE TABLE IF NOT EXISTS application_datasets (
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  dataset_id uuid NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  PRIMARY KEY (application_id, dataset_id)
);

-- Riwayat review aplikasi memakai tabel yang sama dengan layanan & data.
ALTER TABLE validation_history ADD COLUMN IF NOT EXISTS application_id uuid REFERENCES applications(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS validation_history_application_idx ON validation_history (application_id, created_at DESC);

-- Akun demo "Admin Verifikator Aplikasi Diskominfo" (kata sandi sama dengan akun demo lain).
INSERT INTO users (email,password_hash,name,role,opd_id) VALUES
('aplikasi@gresikkab.go.id','$2b$10$KkH8OasC9DhofvM.clBdmu91xxqji4ATHg6zkZ/OyEhiA2JMgpShm','Verifikator Aplikasi Diskominfo','validator_aplikasi',NULL)
ON CONFLICT (email) DO NOTHING;
