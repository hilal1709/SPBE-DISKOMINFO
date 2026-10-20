-- CMS Domain Infrastruktur: referensi RAI berversi (seperti RAB/RAL/RAD/RAA), periode memakai versi RAI,
-- dan komponen infrastruktur mengikuti 10 template analis "Domain Arsitektur Infrastruktur - *.xlsx".
-- Pohon RAI dibuat dari lib/infrastruktur/rai-reference.json (node scripts/extract-rai.mjs --sql).

CREATE TABLE IF NOT EXISTS rai_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  note text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  based_on uuid REFERENCES rai_versions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

CREATE TABLE IF NOT EXISTS rai_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  level int NOT NULL,
  parent_id uuid REFERENCES rai_references(id),
  version_id uuid NOT NULL REFERENCES rai_versions(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'berlaku' CHECK (status IN ('berlaku', 'tidak_berlaku')),
  origin_id uuid REFERENCES rai_references(id) ON DELETE SET NULL,
  UNIQUE (version_id, code)
);
CREATE INDEX IF NOT EXISTS rai_references_origin_idx ON rai_references (origin_id);
CREATE INDEX IF NOT EXISTS rai_references_parent_idx ON rai_references (parent_id);

-- Versi awal (terbit) berisi pohon RAI template analis (baru sampai Level 2; SPLP dinomori RAI.02.02).
INSERT INTO rai_versions (name, note, status, published_at)
SELECT 'Perpres 132/2022', 'Referensi awal dari template Domain Arsitektur Infrastruktur', 'published', now()
WHERE NOT EXISTS (SELECT 1 FROM rai_versions);

INSERT INTO rai_references (code, name, level, parent_id, version_id)
SELECT v.code, v.name, 1, p.id, (SELECT id FROM rai_versions ORDER BY created_at LIMIT 1) FROM (VALUES
('RAI.01','Fasilitas Komputasi',NULL),
('RAI.02','Sistem Integrasi',NULL),
('RAI.03','Platform',NULL)
) AS v(code, name, parent)
LEFT JOIN rai_references p ON p.code = v.parent AND p.version_id = (SELECT id FROM rai_versions ORDER BY created_at LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM rai_references r WHERE r.code = v.code);

INSERT INTO rai_references (code, name, level, parent_id, version_id)
SELECT v.code, v.name, 2, p.id, (SELECT id FROM rai_versions ORDER BY created_at LIMIT 1) FROM (VALUES
('RAI.01.01','Pusat Data Nasional','RAI.01'),
('RAI.01.02','Pusat Komputasi','RAI.01'),
('RAI.01.03','Pusat Kendali','RAI.01'),
('RAI.02.01','Jaringan Intra Pemerintah','RAI.02'),
('RAI.02.02','Sistem Penghubung Layanan Pemerintah','RAI.02'),
('RAI.03.01','Kerangka Infrastruktur dan Aplikasi','RAI.03'),
('RAI.03.02','Komputasi Awan','RAI.03')
) AS v(code, name, parent)
LEFT JOIN rai_references p ON p.code = v.parent AND p.version_id = (SELECT id FROM rai_versions ORDER BY created_at LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM rai_references r WHERE r.code = v.code);

ALTER TABLE architecture_periods ADD COLUMN IF NOT EXISTS rai_version_id uuid REFERENCES rai_versions(id);
UPDATE architecture_periods SET rai_version_id = (SELECT id FROM rai_versions ORDER BY created_at LIMIT 1) WHERE rai_version_id IS NULL;

CREATE TABLE IF NOT EXISTS rai_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES rai_versions(id) ON DELETE CASCADE,
  node_id uuid REFERENCES rai_references(id) ON DELETE SET NULL,
  action text NOT NULL,
  before jsonb,
  after jsonb,
  actor_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rai_changes_version_idx ON rai_changes (version_id, created_at DESC);

-- Komponen infrastruktur: kolom bersama 10 template + kolom khusus per komponen (attributes, kunci di lib/infrastruktur/jenis.ts).
-- opd_id = Instansi (Perangkat Daerah pemilik isian). rai_id = RAI terdalam (L3, atau L2 tanpa turunan).
-- security = dependensi Keamanan SPBE (7 kunci → daftar teks), seperti data & aplikasi.
CREATE TABLE IF NOT EXISTS infrastructures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('fasilitas', 'cloud', 'server', 'jaringan', 'perangkat_keamanan', 'penyimpanan', 'periferal', 'platform', 'jip', 'splp')),
  name text NOT NULL,
  description text,
  owner_name text,
  ownership text CHECK (ownership IN ('milik_sendiri', 'sewa', 'instansi_lain', 'pihak_ketiga')),
  manager text,
  attributes jsonb NOT NULL DEFAULT '{}',
  opd_id uuid NOT NULL REFERENCES opd(id),
  period_id uuid NOT NULL REFERENCES architecture_periods(id),
  rai_id uuid REFERENCES rai_references(id),
  rai4_id uuid REFERENCES rai_references(id),
  rai5_id uuid REFERENCES rai_references(id),
  rai_l4 text,
  rai_l5 text,
  rai_review boolean NOT NULL DEFAULT false,
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
  UNIQUE (code, period_id)
);
CREATE INDEX IF NOT EXISTS infrastructures_status_idx ON infrastructures (status);
CREATE INDEX IF NOT EXISTS infrastructures_opd_idx ON infrastructures (opd_id);
CREATE INDEX IF NOT EXISTS infrastructures_period_idx ON infrastructures (period_id);
CREATE INDEX IF NOT EXISTS infrastructures_kind_idx ON infrastructures (kind);

-- Relasi antarkomponen (mis. server → platform, cloud → SPLP) dan ke domain lain, semuanya pada periode yang sama.
CREATE TABLE IF NOT EXISTS infrastructure_links (
  infrastructure_id uuid NOT NULL REFERENCES infrastructures(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES infrastructures(id) ON DELETE CASCADE,
  PRIMARY KEY (infrastructure_id, target_id),
  CHECK (infrastructure_id <> target_id)
);
CREATE INDEX IF NOT EXISTS infrastructure_links_target_idx ON infrastructure_links (target_id);
CREATE TABLE IF NOT EXISTS infrastructure_applications (
  infrastructure_id uuid NOT NULL REFERENCES infrastructures(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  PRIMARY KEY (infrastructure_id, application_id)
);
CREATE TABLE IF NOT EXISTS infrastructure_datasets (
  infrastructure_id uuid NOT NULL REFERENCES infrastructures(id) ON DELETE CASCADE,
  dataset_id uuid NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  PRIMARY KEY (infrastructure_id, dataset_id)
);
CREATE TABLE IF NOT EXISTS infrastructure_process_businesses (
  infrastructure_id uuid NOT NULL REFERENCES infrastructures(id) ON DELETE CASCADE,
  process_business_id uuid NOT NULL REFERENCES process_businesses(id) ON DELETE CASCADE,
  PRIMARY KEY (infrastructure_id, process_business_id)
);

-- Riwayat review infrastruktur memakai tabel yang sama dengan domain lain.
ALTER TABLE validation_history ADD COLUMN IF NOT EXISTS infrastructure_id uuid REFERENCES infrastructures(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS validation_history_infrastructure_idx ON validation_history (infrastructure_id, created_at DESC);

-- Akun demo "Admin Verifikator Infrastruktur Diskominfo" (kata sandi sama dengan akun demo lain).
INSERT INTO users (email,password_hash,name,role,opd_id) VALUES
('infrastruktur@gresikkab.go.id','$2b$10$KkH8OasC9DhofvM.clBdmu91xxqji4ATHg6zkZ/OyEhiA2JMgpShm','Verifikator Infrastruktur Diskominfo','validator_infrastruktur',NULL)
ON CONFLICT (email) DO NOTHING;
