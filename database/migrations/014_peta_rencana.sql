-- Domain Peta Rencana: kegiatan target arsitektur per tahun dalam satu periode (referensi: Peta Rencana SPBE Gresik 2025–2029).
-- Dikelola langsung oleh Diskominfo (Admin Operator) tanpa alur verifikasi; `status` = status pelaksanaan.
-- Tabel roadmap_items lama di schema.sql tidak pernah dipakai, diganti struktur baru.
DROP TABLE IF EXISTS roadmap_items;
DROP TYPE IF EXISTS roadmap_status;

CREATE TABLE IF NOT EXISTS roadmap_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  period_id uuid NOT NULL REFERENCES architecture_periods(id),
  opd_id uuid NOT NULL REFERENCES opd(id),
  sasaran text NOT NULL,
  inisiatif text,
  muatan text NOT NULL CHECK (muatan IN ('aplikasi', 'layanan', 'data', 'infrastruktur', 'keamanan', 'tata_kelola', 'manajemen', 'audit')),
  program text,
  name text NOT NULL,
  year int NOT NULL,
  target text,
  jumlah numeric NOT NULL DEFAULT 1,
  satuan text NOT NULL DEFAULT 'Kegiatan',
  status text NOT NULL DEFAULT 'direncanakan' CHECK (status IN ('direncanakan', 'berjalan', 'terlaksana', 'ditunda', 'batal')),
  realisasi text,
  evaluation_note text,
  -- Asal usulan: manual, hasil gap analysis, atau usulan OPD yang tidak ter-cover tahun berjalan (notulen 1 Juli 2026).
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'gap', 'usulan_tertunda')),
  source_ref text,
  deferred_from uuid REFERENCES roadmap_items(id) ON DELETE SET NULL,
  is_sample boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES users(id),
  updated_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code, period_id)
);
CREATE INDEX IF NOT EXISTS roadmap_items_period_idx ON roadmap_items (period_id, year);
CREATE INDEX IF NOT EXISTS roadmap_items_opd_idx ON roadmap_items (opd_id);
CREATE INDEX IF NOT EXISTS roadmap_items_status_idx ON roadmap_items (status);

-- Indikator sasaran & target per tahun (tabel "Target Indikator Peta Rencana"). targets = {"2026": "10,49", ...}.
CREATE TABLE IF NOT EXISTS roadmap_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid NOT NULL REFERENCES architecture_periods(id) ON DELETE CASCADE,
  sasaran text NOT NULL,
  inisiatif text,
  indikator text NOT NULL,
  targets jsonb NOT NULL DEFAULT '{}',
  is_sample boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (period_id, sasaran, indikator)
);

-- Akun demo "Diskominfo (Admin Operator)" (kata sandi sama dengan akun demo lain).
INSERT INTO users (email,password_hash,name,role,opd_id) VALUES
('perencanaan@gresikkab.go.id','$2b$10$KkH8OasC9DhofvM.clBdmu91xxqji4ATHg6zkZ/OyEhiA2JMgpShm','Admin Operator Diskominfo','operator_diskominfo',NULL)
ON CONFLICT (email) DO NOTHING;
