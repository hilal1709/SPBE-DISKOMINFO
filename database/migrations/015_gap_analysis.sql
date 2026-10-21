-- Gap Analysis: kesenjangan AS-IS (data tervalidasi tiap domain) terhadap target arsitektur, per periode.
-- Temuan otomatis berasal dari aturan di lib/gap/rules.ts (rule = kunci aturan); temuan manual rule = NULL (mis. SDM).
-- Notulen 1 Juli 2026: gap diselesaikan sebelum Peta Rencana dan hasilnya ditarik menjadi usulan Peta Rencana.
-- Tabel gap_analyses lama di schema.sql tidak pernah dipakai, diganti struktur baru.
DROP TABLE IF EXISTS gap_analyses;

CREATE TABLE IF NOT EXISTS gap_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  period_id uuid NOT NULL REFERENCES architecture_periods(id),
  opd_id uuid REFERENCES opd(id),
  domain text NOT NULL CHECK (domain IN ('aplikasi', 'layanan', 'data', 'infrastruktur', 'keamanan', 'tata_kelola', 'manajemen', 'audit')),
  rule text,
  subject_code text,
  subject_name text NOT NULL,
  -- Sasaran strategis terkait (dari probis subjek bila ada) untuk mengisi usulan Peta Rencana.
  sasaran text,
  as_is text NOT NULL,
  target text NOT NULL,
  rekomendasi text NOT NULL,
  priority text NOT NULL CHECK (priority IN ('tinggi', 'sedang', 'rendah')),
  status text NOT NULL DEFAULT 'terbuka' CHECK (status IN ('terbuka', 'diusulkan', 'ditindaklanjuti', 'diabaikan')),
  note text,
  roadmap_item_id uuid REFERENCES roadmap_items(id) ON DELETE SET NULL,
  is_sample boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES users(id),
  updated_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code, period_id)
);
-- Satu temuan per aturan & subjek per periode (temuan manual tidak dibatasi).
CREATE UNIQUE INDEX IF NOT EXISTS gap_analyses_rule_subject_idx ON gap_analyses (period_id, rule, subject_code) WHERE rule IS NOT NULL;
CREATE INDEX IF NOT EXISTS gap_analyses_status_idx ON gap_analyses (period_id, status);
CREATE INDEX IF NOT EXISTS gap_analyses_roadmap_idx ON gap_analyses (roadmap_item_id);
