-- CMS Domain Keamanan: 7 kegiatan mengikuti template analis "Domain Arsitektur Keamanan"
-- (Standar Teknis dan Prosedur, Penerapan: edukasi, identifikasi kerentanan, peningkatan, penanganan insiden, audit; Kelaikan).
-- kind = kunci securityFields (dependensi keamanan di template Data, Aplikasi, Infrastruktur).
-- attributes = kolom khusus kegiatan (kunci di lib/keamanan/jenis.ts), mis. jenis standar & tanggal akhir, hasil audit, nilai kematangan.
CREATE TABLE IF NOT EXISTS security_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('standar', 'edukasi', 'kerentanan', 'peningkatan', 'insiden', 'audit', 'kelaikan')),
  name text NOT NULL,
  description text,
  activity_date date,
  attributes jsonb NOT NULL DEFAULT '{}',
  opd_id uuid NOT NULL REFERENCES opd(id),
  period_id uuid NOT NULL REFERENCES architecture_periods(id),
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
CREATE INDEX IF NOT EXISTS security_activities_status_idx ON security_activities (status);
CREATE INDEX IF NOT EXISTS security_activities_opd_idx ON security_activities (opd_id);
CREATE INDEX IF NOT EXISTS security_activities_period_idx ON security_activities (period_id);

-- Riwayat review kegiatan keamanan memakai tabel yang sama dengan domain lain.
ALTER TABLE validation_history ADD COLUMN IF NOT EXISTS security_activity_id uuid REFERENCES security_activities(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS validation_history_security_idx ON validation_history (security_activity_id, created_at DESC);

-- Akun demo "Admin Verifikator Keamanan Diskominfo" (kata sandi sama dengan akun demo lain).
INSERT INTO users (email,password_hash,name,role,opd_id) VALUES
('keamanan@gresikkab.go.id','$2b$10$KkH8OasC9DhofvM.clBdmu91xxqji4ATHg6zkZ/OyEhiA2JMgpShm','Verifikator Keamanan Diskominfo','validator_keamanan',NULL)
ON CONFLICT (email) DO NOTHING;
