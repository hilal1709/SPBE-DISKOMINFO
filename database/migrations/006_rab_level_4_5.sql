-- RAB Level 4/5: tautan ke referensi bila kodenya terdaftar. Kolom teks rab_l4/rab_l5 tetap menyimpan isian
-- (kode terdaftar atau teks bebas selama referensi L4/L5 belum tersedia).
ALTER TABLE process_businesses
  ADD COLUMN IF NOT EXISTS rab4_id uuid REFERENCES rab_references(id),
  ADD COLUMN IF NOT EXISTS rab5_id uuid REFERENCES rab_references(id);
