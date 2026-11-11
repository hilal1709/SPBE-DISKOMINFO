-- Muatan kegiatan Peta Rencana dikelola di CMS (tambah/ubah/hapus), tidak lagi daftar tetap di CHECK.
CREATE TABLE IF NOT EXISTS muatan (
  key text PRIMARY KEY,
  label text NOT NULL,
  abbr text NOT NULL UNIQUE,
  tone text NOT NULL DEFAULT '--brand-teal',
  sort int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO muatan (key, label, abbr, tone, sort) VALUES
  ('aplikasi', 'Aplikasi', 'APL', '--brand-teal', 1),
  ('layanan', 'Layanan', 'LAY', '--brand-sky', 2),
  ('data', 'Data', 'DAT', '--brand-yellow', 3),
  ('infrastruktur', 'Infrastruktur', 'INF', '--brand-amber', 4),
  ('keamanan', 'Keamanan', 'KAM', '--brand-orange', 5),
  ('tata_kelola', 'Tata Kelola', 'TKL', '--brand-teal', 6),
  ('manajemen', 'Manajemen', 'MNJ', '--brand-sky', 7),
  ('audit', 'Audit', 'AUD', '--brand-yellow', 8)
ON CONFLICT (key) DO NOTHING;
ALTER TABLE roadmap_items DROP CONSTRAINT IF EXISTS roadmap_items_muatan_check;
ALTER TABLE roadmap_items DROP CONSTRAINT IF EXISTS roadmap_items_muatan_fkey;
ALTER TABLE roadmap_items ADD CONSTRAINT roadmap_items_muatan_fkey FOREIGN KEY (muatan) REFERENCES muatan(key) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE muatan ENABLE ROW LEVEL SECURITY
